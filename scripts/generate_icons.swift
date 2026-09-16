import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let basePath = "/Users/iftekhar/Public/office/game_app"
let logoUrl = URL(fileURLWithPath: "\(basePath)/src/assets/images/logo.png")

guard let source = CGImageSourceCreateWithURL(logoUrl as CFURL, nil),
      let logoCG = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    print("Error: Could not load logo from \(logoUrl.path)")
    exit(1)
}

func renderIcon(width: Int, height: Int, circular: Bool = false) -> CGImage? {
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let bitmapInfo: UInt32 = circular 
        ? (CGBitmapInfo.byteOrder32Big.rawValue | CGImageAlphaInfo.premultipliedLast.rawValue)
        : CGImageAlphaInfo.noneSkipLast.rawValue

    guard let ctx = CGContext(
        data: nil,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: width * 4,
        space: colorSpace,
        bitmapInfo: bitmapInfo
    ) else {
        return nil
    }

    let rect = CGRect(x: 0, y: 0, width: width, height: height)

    if circular {
        ctx.addEllipse(in: rect)
        ctx.clip()
    }

    // Black background
    ctx.setFillColor(red: 0, green: 0, blue: 0, alpha: 1.0)
    ctx.fill(rect)

    // Draw logo centered with ~18% margin
    let maxDim = CGFloat(width) * 0.65
    let scale = min(maxDim / CGFloat(logoCG.width), maxDim / CGFloat(logoCG.height))
    let drawW = CGFloat(logoCG.width) * scale
    let drawH = CGFloat(logoCG.height) * scale
    let drawX = (CGFloat(width) - drawW) / 2.0
    let drawY = (CGFloat(height) - drawH) / 2.0

    ctx.draw(logoCG, in: CGRect(x: drawX, y: drawY, width: drawW, height: drawH))
    return ctx.makeImage()
}

func savePNG(_ image: CGImage, to path: String) {
    let url = URL(fileURLWithPath: path)
    guard let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else {
        print("Failed destination for \(path)")
        return
    }
    CGImageDestinationAddImage(dest, image, nil)
    CGImageDestinationFinalize(dest)
}

// 1. Master Icon (1024x1024)
if let master = renderIcon(width: 1024, height: 1024) {
    savePNG(master, to: "\(basePath)/src/assets/images/app-icon.png")
    savePNG(master, to: "\(basePath)/ios/GameApp/Images.xcassets/AppIcon.appiconset/icon-1024.png")
}

// 2. iOS AppIcon sizes
let iosDir = "\(basePath)/ios/GameApp/Images.xcassets/AppIcon.appiconset"
let iosSizes: [(String, Int)] = [
    ("icon-20@2x.png", 40),
    ("icon-20@3x.png", 60),
    ("icon-29@2x.png", 58),
    ("icon-29@3x.png", 87),
    ("icon-40@2x.png", 80),
    ("icon-40@3x.png", 120),
    ("icon-60@2x.png", 120),
    ("icon-60@3x.png", 180)
]

for (filename, px) in iosSizes {
    if let img = renderIcon(width: px, height: px) {
        savePNG(img, to: "\(iosDir)/\(filename)")
    }
}

// 3. Android Mipmap sizes
let androidResDir = "\(basePath)/android/app/src/main/res"
let androidSizes: [(String, Int)] = [
    ("mipmap-mdpi", 48),
    ("mipmap-hdpi", 72),
    ("mipmap-xhdpi", 96),
    ("mipmap-xxhdpi", 144),
    ("mipmap-xxxhdpi", 192)
]

for (folder, px) in androidSizes {
    let folderPath = "\(androidResDir)/\(folder)"
    if let square = renderIcon(width: px, height: px, circular: false) {
        savePNG(square, to: "\(folderPath)/ic_launcher.png")
    }
    if let round = renderIcon(width: px, height: px, circular: true) {
        savePNG(round, to: "\(folderPath)/ic_launcher_round.png")
    }
}

print("SUCCESS: App icon generated from logo.png for all iOS and Android sizes!")
