import 'package:flutter/material.dart';

/// Visual Identity & Design System for Dr. Mahmoud Elmahdy Educational Platform
/// Based on elmahdy_blue_mobile_redesign specification
class AppColors {
  AppColors._();

  // ── Primary Brand Palette (الهوية الزرقاء الهادئة) ──
  static const Color blue = Color(0xFF2F89F6);       // var(--blue)
  static const Color blueDark = Color(0xFF176DDB);   // var(--blue-dark)
  static const Color primary = blue;
  static const Color primaryDark = blueDark;
  static const Color primaryLight = Color(0xFF5CA3F8);

  // ── Typography & Ink ──
  static const Color ink = Color(0xFF112344);        // var(--ink) Text primary
  static const Color muted = Color(0xFF7A8CA7);      // var(--muted) Text secondary
  static const Color textLight = ink;
  static const Color textLightSecondary = muted;
  static const Color textLightMuted = Color(0xFF8C9DB5);

  // ── Surfaces, Borders & Canvas ──
  static const Color bgLight = Color(0xFFF8FAFD);     // Mobile background
  static const Color bgLightSecondary = Color(0xFFE9EEF6);
  static const Color cardLight = Colors.white;
  static const Color line = Color(0xFFE5ECF6);        // var(--line)
  static const Color borderLight = line;
  static const Color soft = Color(0xFFEAF3FF);        // var(--soft) Light blue tint
  static const Color soft2 = Color(0xFFF5F8FD);       // var(--soft2)

  // ── Status & Accent Colors ──
  static const Color green = Color(0xFF1BA774);       // var(--green)
  static const Color greenLight = Color(0xFFE5F8F0);
  static const Color emerald = green;
  static const Color emeraldDark = Color(0xFF078456);

  static const Color amber = Color(0xFFD08729);       // var(--amber)
  static const Color amberLight = Color(0xFFFFF4DF);
  static const Color amberDark = Color(0xFFAD731B);
  static const Color starGold = Color(0xFFFFB800);

  static const Color red = Color(0xFFE85F65);         // var(--red)
  static const Color redLight = Color(0xFFFFF0F0);
  static const Color rose = red;

  // ── 5 Quick Service Pastel Backgrounds & Icons ──
  static const Color serviceBlueBg = Color(0xFFE9F3FF);
  static const Color serviceBlueIcon = Color(0xFF176DDB);

  static const Color serviceGreenBg = Color(0xFFE5F8F0);
  static const Color serviceGreenIcon = Color(0xFF19976A);

  static const Color serviceAmberBg = Color(0xFFFFF3DF);
  static const Color serviceAmberIcon = Color(0xFFC58324);

  static const Color servicePurpleBg = Color(0xFFF0EFFF);
  static const Color servicePurpleIcon = Color(0xFF7770CF);

  static const Color servicePinkBg = Color(0xFFFFEEF0);
  static const Color servicePinkIcon = Color(0xFFD66B77);

  // Aliases for compatibility
  static const Color pastelPink = servicePinkBg;
  static const Color pastelPinkIcon = servicePinkIcon;
  static const Color pastelMint = serviceGreenBg;
  static const Color pastelMintIcon = serviceGreenIcon;
  static const Color pastelSky = serviceBlueBg;
  static const Color pastelSkyIcon = serviceBlueIcon;
  static const Color pastelIndigo = servicePurpleBg;
  static const Color pastelIndigoIcon = servicePurpleIcon;
  static const Color pastelPeach = serviceAmberBg;
  static const Color pastelPeachIcon = serviceAmberIcon;

  // ── Shadows & Radii ──
  static const double radiusCard = 19.0;
  static const double radiusButton = 11.0;
  static const double radiusHero = 23.0;
  static const double radiusNav = 20.0;

  static List<BoxShadow> get cardShadow => [
    const BoxShadow(
      color: Color.fromRGBO(29, 65, 114, 0.052),
      blurRadius: 25,
      offset: Offset(0, 8),
    ),
  ];

  static List<BoxShadow> get heroShadow => [
    const BoxShadow(
      color: Color.fromRGBO(47, 137, 246, 0.11),
      blurRadius: 19,
      offset: Offset(0, 9),
    ),
  ];

  static List<BoxShadow> get navShadow => [
    const BoxShadow(
      color: Color.fromRGBO(47, 137, 246, 0.10),
      blurRadius: 19,
      offset: Offset(0, -7),
    ),
  ];

  // Gradients
  static const LinearGradient royalGradient = LinearGradient(
    colors: [blue, blueDark],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient obsidianGradient = LinearGradient(
    colors: [Color(0xFF0F172A), Color(0xFF020617)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static const LinearGradient cardDarkGradient = LinearGradient(
    colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Dark fallback aliases
  static const Color bgDark = Color(0xFF0F172A);
  static const Color bgDarkSecondary = Color(0xFF0B1120);
  static const Color cardDark = Color(0xFF1E293B);
  static const Color cardDarkElevated = Color(0xFF1E293B);
  static const Color surfaceElevatedDark = cardDarkElevated;
  static const Color cardDarkLighter = Color(0xFF334155);
  static const Color borderDark = Color(0xFF334155);
  static const Color borderDarkSubtle = Color(0xFF1E293B);
  static const Color textDark = Color(0xFFF8FAFC);
  static const Color textDarkSecondary = Color(0xFF94A3B8);
  static const Color textDarkMuted = Color(0xFF64748B);
  static const Color purple = servicePurpleIcon;

  // ── Backward Compatible & Legacy Aliases ──
  static const Color stitchCoral = Color(0xFFFF6B6B);
  static const Color stitchCoralContainer = Color(0xFFFFE5E5);
  static const Color stitchCoralLight = Color(0xFFFFF1F2);
  static const Color coralPrimary = stitchCoral;
  static const Color coralLight = Color(0xFFFFF0EF);
  static const Color coralBorder = Color(0xFFFFD9D7);
  static const Color coralDark = Color(0xFF291515);
  static const Color coralBorderDark = Color(0xFF4A2525);

  static const Color headerMintLight = Color(0xFFEBF7F2);
  static const Color headerMintDark = Color(0xFF0F1E19);
  static const Color headerMintBorder = Color(0xFFD1EADC);
  static const Color headerMintBorderDark = Color(0xFF1D352D);
  static const Color headerMintText = Color(0xFF2D624C);
  static const Color headerMintTextDark = Color(0xFF7CE2B6);
  static const Color headerMintPill = Color(0xFF10B981);

  static const Color statTealBg = Color(0xFFECFDF5);
  static const Color statTealBorder = Color(0xFFA7F3D0);
  static const Color statTealText = Color(0xFF047857);

  static const Color statCoralBg = Color(0xFFFFF1F2);
  static const Color statCoralBorder = Color(0xFFFECDD3);
  static const Color statCoralText = Color(0xFFBE123C);

  static const Color statPurpleBg = Color(0xFFF5F3FF);
  static const Color statPurpleBorder = Color(0xFFDDD6FE);
  static const Color statPurpleText = Color(0xFF6D28D9);

  static const Color statNavyBg = Color(0xFFF0F4FA);
  static const Color statNavyBorder = Color(0xFFD6E2F0);
  static const Color statNavyText = Color(0xFF1E3A8A);

  static const Color statMintBg = Color(0xFFECFDF5);
  static const Color statMintBorder = Color(0xFFA7F3D0);
  static const Color statMintText = Color(0xFF047857);

  static const Color statIndigoBg = Color(0xFFEEF2FF);
  static const Color statIndigoBorder = Color(0xFFC7D2FE);
  static const Color statIndigoText = Color(0xFF4338CA);

  static const Color statAmberBg = Color(0xFFFFFBEB);
  static const Color statAmberBorder = Color(0xFFFDE68A);
  static const Color statAmberText = Color(0xFFB45309);

  static const Color gold = Color(0xFFD4AF37);
  static const Color goldLight = Color(0xFFF59E0B);
  static const Color goldDark = Color(0xFFB45309);
}
