// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "KiroTaskTray",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(name: "KiroTaskTray", targets: ["KiroTaskTray"])
    ],
    targets: [
        .executableTarget(
            name: "KiroTaskTray"
        ),
        .testTarget(
            name: "KiroTaskTrayTests",
            dependencies: ["KiroTaskTray"]
        )
    ]
)
