package com.tablemint.captain.ui.theme

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val Amber       = Color(0xFFD4883A)
val AmberLight  = Color(0xFFFBF0E0)
val AmberDark   = Color(0xFFB8732E)
val BgMain      = Color(0xFFFDFAF6)
val BgSoft      = Color(0xFFF5F0E8)
val BgCard      = Color(0xFFFFFFFF)
val TextDark    = Color(0xFF2C2416)
val TextMid     = Color(0xFF6B5B45)
val TextMuted   = Color(0xFFA0907A)
val BorderColor = Color(0xFFE8E0D0)
val GreenColor  = Color(0xFF4A9B6F)
val GreenLight  = Color(0xFFE8F5EE)
val RedColor    = Color(0xFFD05A4A)
val RedLight    = Color(0xFFFDECEA)

private val TableMintColorScheme = lightColorScheme(
    primary         = Amber,
    onPrimary       = Color.White,
    primaryContainer = AmberLight,
    onPrimaryContainer = TextDark,
    secondary       = GreenColor,
    onSecondary     = Color.White,
    background      = BgMain,
    onBackground    = TextDark,
    surface         = BgCard,
    onSurface       = TextDark,
    surfaceVariant  = BgSoft,
    onSurfaceVariant = TextMid,
    error           = RedColor,
    onError         = Color.White,
    outline         = BorderColor,
)

@Composable
fun TableMintCaptainTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = TableMintColorScheme,
        content = content
    )
}
