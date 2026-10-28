// Video helper for the site, built on AVFoundation so it needs nothing beyond macOS.
//
//   swift tools/videos.swift probe IN.mp4
//   swift tools/videos.swift encode IN.mp4 OUT.mp4 TARGET_MB
//       H.264 High, longest side 1920, AAC 128 kb/s, moov atom first (faststart).
//       The video bitrate is picked so the file lands near TARGET_MB.
//   swift tools/videos.swift poster IN.mp4 SECONDS OUT.jpg [OUT.webp]

import AVFoundation
import CoreImage
import Foundation
import ImageIO
import UniformTypeIdentifiers

func fail(_ message: String) -> Never {
    FileHandle.standardError.write((message + "\n").data(using: .utf8)!)
    exit(1)
}

let args = CommandLine.arguments
guard args.count >= 3 else { fail("usage: probe|encode|poster ...") }
let input = URL(fileURLWithPath: args[2])
let asset = AVURLAsset(url: input)

func describe() async throws {
    let duration = try await asset.load(.duration).seconds
    print(String(format: "duration %.2fs", duration))
    for track in try await asset.load(.tracks) {
        let rate = try await track.load(.estimatedDataRate)
        let formats = try await track.load(.formatDescriptions)
        let codec = formats.first.map { CMFormatDescriptionGetMediaSubType($0) }.map { code -> String in
            let bytes = [24, 16, 8, 0].map { UInt8((code >> $0) & 0xff) }
            return String(bytes: bytes, encoding: .ascii) ?? "?"
        } ?? "?"
        if track.mediaType == .video {
            let size = try await track.load(.naturalSize)
            let fps = try await track.load(.nominalFrameRate)
            print(String(format: "video %@ %.0fx%.0f %.2f fps %.0f kb/s", codec, size.width, size.height, fps, rate / 1000))
        } else {
            print(String(format: "%@ %@ %.0f kb/s", track.mediaType.rawValue, codec, rate / 1000))
        }
    }
}

func encode(to output: URL, targetMB: Double) async throws {
    let duration = try await asset.load(.duration).seconds
    guard let videoTrack = try await asset.loadTracks(withMediaType: .video).first else { fail("no video track") }
    let audioTrack = try await asset.loadTracks(withMediaType: .audio).first
    let natural = try await videoTrack.load(.naturalSize)
    let transform = try await videoTrack.load(.preferredTransform)
    let fps = try await videoTrack.load(.nominalFrameRate)

    // Fit inside 1920x1080 (or 1080x1920), keep even dimensions.
    let oriented = natural.applying(transform)
    let w0 = abs(oriented.width), h0 = abs(oriented.height)
    let scale = min(1, 1920 / max(w0, h0), 1080 / min(w0, h0))
    let width = Int((w0 * scale / 2).rounded()) * 2
    let height = Int((h0 * scale / 2).rounded()) * 2

    let audioBits = audioTrack == nil ? 0.0 : 128_000.0
    let videoBits = max(600_000, targetMB * 1_000_000 * 8 * 0.97 / duration - audioBits)

    try? FileManager.default.removeItem(at: output)
    let reader = try AVAssetReader(asset: asset)
    let writer = try AVAssetWriter(outputURL: output, fileType: .mp4)
    writer.shouldOptimizeForNetworkUse = true

    let composition = AVMutableVideoComposition()
    composition.renderSize = CGSize(width: width, height: height)
    composition.frameDuration = CMTime(value: 1, timescale: CMTimeScale(max(24, fps.rounded())))
    let instruction = AVMutableVideoCompositionInstruction()
    instruction.timeRange = CMTimeRange(start: .zero, duration: try await asset.load(.duration))
    let layer = AVMutableVideoCompositionLayerInstruction(assetTrack: videoTrack)
    let s = CGFloat(width) / w0
    layer.setTransform(transform.concatenating(CGAffineTransform(scaleX: s, y: s)), at: .zero)
    instruction.layerInstructions = [layer]
    composition.instructions = [instruction]

    let videoOut = AVAssetReaderVideoCompositionOutput(videoTracks: [videoTrack], videoSettings: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange,
    ])
    videoOut.videoComposition = composition
    reader.add(videoOut)
    let videoIn = AVAssetWriterInput(mediaType: .video, outputSettings: [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: width,
        AVVideoHeightKey: height,
        AVVideoCompressionPropertiesKey: [
            AVVideoAverageBitRateKey: Int(videoBits),
            AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
            AVVideoMaxKeyFrameIntervalDurationKey: 2,
            AVVideoAllowFrameReorderingKey: true,
        ],
    ])
    videoIn.expectsMediaDataInRealTime = false
    writer.add(videoIn)

    var audioOut: AVAssetReaderTrackOutput?
    var audioIn: AVAssetWriterInput?
    if let audioTrack {
        let out = AVAssetReaderTrackOutput(track: audioTrack, outputSettings: [AVFormatIDKey: kAudioFormatLinearPCM])
        reader.add(out)
        let inp = AVAssetWriterInput(mediaType: .audio, outputSettings: [
            AVFormatIDKey: kAudioFormatMPEG4AAC,
            AVNumberOfChannelsKey: 2,
            AVSampleRateKey: 48_000,
            AVEncoderBitRateKey: 128_000,
        ])
        writer.add(inp)
        audioOut = out
        audioIn = inp
    }

    guard reader.startReading() else { fail("reader: \(String(describing: reader.error))") }
    guard writer.startWriting() else { fail("writer: \(String(describing: writer.error))") }
    writer.startSession(atSourceTime: .zero)

    func pump(_ input: AVAssetWriterInput, _ output: AVAssetReaderOutput, _ label: String) async {
        await withCheckedContinuation { (done: CheckedContinuation<Void, Never>) in
            input.requestMediaDataWhenReady(on: DispatchQueue(label: label)) {
                while input.isReadyForMoreMediaData {
                    if let sample = output.copyNextSampleBuffer() {
                        input.append(sample)
                    } else {
                        input.markAsFinished()
                        done.resume()
                        return
                    }
                }
            }
        }
    }
    async let v: Void = pump(videoIn, videoOut, "video")
    if let audioIn, let audioOut { await pump(audioIn, audioOut, "audio") }
    await v
    await writer.finishWriting()
    if writer.status != .completed { fail("write failed: \(String(describing: writer.error))") }
    let bytes = (try FileManager.default.attributesOfItem(atPath: output.path)[.size] as? NSNumber)?.doubleValue ?? 0
    print(String(format: "%@ %dx%d video %.0f kb/s -> %.2f MB", output.lastPathComponent, width, height, videoBits / 1000, bytes / 1_000_000))
}

func poster(at seconds: Double, jpg: URL, webp: URL?) async throws {
    let generator = AVAssetImageGenerator(asset: asset)
    generator.appliesPreferredTrackTransform = true
    generator.requestedTimeToleranceBefore = .zero
    generator.requestedTimeToleranceAfter = .zero
    generator.maximumSize = CGSize(width: 1280, height: 1280)
    let (image, _) = try await generator.image(at: CMTime(seconds: seconds, preferredTimescale: 600))
    func write(_ url: URL, _ type: UTType, _ quality: Double) -> Bool {
        guard let dest = CGImageDestinationCreateWithURL(url as CFURL, type.identifier as CFString, 1, nil) else { return false }
        CGImageDestinationAddImage(dest, image, [kCGImageDestinationLossyCompressionQuality: quality] as CFDictionary)
        return CGImageDestinationFinalize(dest)
    }
    guard write(jpg, .jpeg, 0.8) else { fail("could not write \(jpg.path)") }
    print("\(jpg.lastPathComponent) \(image.width)x\(image.height)")
    if let webp {
        print(write(webp, .webP, 0.78) ? "\(webp.lastPathComponent) written" : "webp not supported here, skipped")
    }
}

let semaphore = DispatchSemaphore(value: 0)
Task {
    do {
        switch args[1] {
        case "probe": try await describe()
        case "encode":
            guard args.count == 5, let mb = Double(args[4]) else { fail("encode IN OUT TARGET_MB") }
            try await encode(to: URL(fileURLWithPath: args[3]), targetMB: mb)
        case "poster":
            guard args.count >= 5, let t = Double(args[3]) else { fail("poster IN SECONDS OUT.jpg [OUT.webp]") }
            try await poster(at: t, jpg: URL(fileURLWithPath: args[4]), webp: args.count > 5 ? URL(fileURLWithPath: args[5]) : nil)
        default: fail("unknown command \(args[1])")
        }
    } catch { fail("error: \(error)") }
    semaphore.signal()
}
semaphore.wait()
