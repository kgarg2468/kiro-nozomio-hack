import SwiftUI

enum KiroTheme {
    static let navy = Color(hex: 0x151A27)
    static let navyRaised = Color(hex: 0x1D2737)
    static let navyPanel = Color(hex: 0x23344A)
    static let floor = Color(hex: 0xB8AFA7)
    static let wood = Color(hex: 0x9B642D)
    static let woodDark = Color(hex: 0x5F351C)
    static let meetingBlue = Color(hex: 0x4F82A3)
    static let tile = Color(hex: 0xD7CBC1)
    static let ink = Color(hex: 0xF4F7FB)
    static let mutedInk = Color(hex: 0xB8C2D0)
    static let cyan = Color(hex: 0x8BD3FF)
    static let amber = Color(hex: 0xF1B35A)
    static let green = Color(hex: 0x79D69F)
    static let red = Color(hex: 0xF87171)

    static let agentPalette = [
        Color(hex: 0x2F80ED),
        Color(hex: 0x27AE60),
        Color(hex: 0xEB5757),
        Color(hex: 0x9B51E0),
        Color(hex: 0xF2994A),
        Color(hex: 0x56CCF2)
    ]
}

extension Color {
    init(hex: UInt32, opacity: Double = 1) {
        let red = Double((hex >> 16) & 0xff) / 255
        let green = Double((hex >> 8) & 0xff) / 255
        let blue = Double(hex & 0xff) / 255
        self.init(red: red, green: green, blue: blue, opacity: opacity)
    }
}
