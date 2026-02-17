import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Premium Apple-style design system for Repoverse
class AppTheme {
  // ============================================
  // COLORS (Dark Apple Style)
  // ============================================
  
  static const Color background = Color(0xFF0B0B0F);
  static const Color surface = Color(0xFF111218);
  static const Color elevatedSurface = Color(0xFF181A22);
  static const Color divider = Color(0xFF1C1C24);
  
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFFA1A1AA);
  
  static const Color accent = Color(0xFF0A84FF); // iOS Blue
  
  // Semantic colors
  static const Color success = Color(0xFF34C759);
  static const Color warning = Color(0xFFFF9500);
  static const Color error = Color(0xFFFF3B30);
  
  // ============================================
  // TYPOGRAPHY (Apple-style with Inter)
  // ============================================
  
  // Font family - will use system font if Inter not available
  // To use Inter: download fonts and uncomment in pubspec.yaml
  static const String fontFamily = 'Inter';
  
  // 1. Display Large - For large onboarding headlines and hero text
  static const TextStyle displayLarge = TextStyle(
    fontSize: 32,
    fontWeight: FontWeight.w600, // SemiBold
    letterSpacing: -0.5,
    height: 1.2,
    color: textPrimary,
    fontFamily: fontFamily,
  );
  
  // 2. Title Large - For screen headers
  static const TextStyle titleLarge = TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.w600, // SemiBold
    letterSpacing: -0.3,
    height: 1.25,
    color: textPrimary,
    fontFamily: fontFamily,
  );
  
  // 3. Title Medium - For section titles
  static const TextStyle titleMedium = TextStyle(
    fontSize: 20,
    fontWeight: FontWeight.w600, // SemiBold
    letterSpacing: -0.2,
    height: 1.3,
    color: textPrimary,
    fontFamily: fontFamily,
  );
  
  // 4. Repo Title - For repository names in cards and lists
  static const TextStyle repoTitle = TextStyle(
    fontSize: 18,
    fontWeight: FontWeight.w500, // Medium
    letterSpacing: -0.1,
    height: 1.3,
    color: textPrimary,
    fontFamily: fontFamily,
  );
  
  // 5. Body Large - For long text and README paragraphs
  static const TextStyle bodyLarge = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w400, // Regular
    height: 1.45,
    color: textPrimary,
    fontFamily: fontFamily,
  );
  
  // 6. Body Medium - For descriptions and previews
  static const TextStyle bodyMedium = TextStyle(
    fontSize: 15,
    fontWeight: FontWeight.w400, // Regular
    height: 1.45,
    color: textPrimary,
    fontFamily: fontFamily,
  );
  
  // 7. Secondary Text - For owner names and supporting info
  static const TextStyle secondaryText = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w400, // Regular
    height: 1.4,
    color: textSecondary,
    fontFamily: fontFamily,
  );
  
  // 8. Meta Text - For stars, forks, timestamps
  static const TextStyle metaText = TextStyle(
    fontSize: 13,
    fontWeight: FontWeight.w400, // Regular
    letterSpacing: 0.2,
    color: textSecondary,
    fontFamily: fontFamily,
  );
  
  // 9. Tag Text - For topic pills
  static const TextStyle tagText = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w500, // Medium
    letterSpacing: 0.2,
    color: textPrimary,
    fontFamily: fontFamily,
  );
  
  // 10. Button Text - For primary and secondary buttons
  static const TextStyle buttonText = TextStyle(
    fontSize: 15,
    fontWeight: FontWeight.w500, // Medium
    color: textPrimary,
    fontFamily: fontFamily,
  );
  
  // Legacy aliases for backward compatibility
  static const TextStyle largeTitle = displayLarge;
  static const TextStyle sectionTitle = titleLarge;
  static const TextStyle repoName = repoTitle;
  static const TextStyle body = bodyMedium;
  static const TextStyle meta = metaText;
  
  // Text colors
  static const Color textTertiary = Color(0xFF6B7280);
  
  // ============================================
  // RADIUS & SPACING
  // ============================================
  
  static const double radiusSmall = 12;
  static const double radiusMedium = 18;
  static const double radiusLarge = 24;
  static const double radiusXLarge = 32;
  
  static const double spacingXS = 4;
  static const double spacingSM = 8;
  static const double spacingMD = 16;
  static const double spacingLG = 24;
  static const double spacingXL = 32;
  
  // ============================================
  // SHADOWS
  // ============================================
  
  static List<BoxShadow> get ambientShadow => [
    BoxShadow(
      color: Colors.black.withOpacity(0.4),
      blurRadius: 30,
      offset: const Offset(0, 10),
      spreadRadius: 0,
    ),
  ];
  
  static List<BoxShadow> get cardShadow => [
    BoxShadow(
      color: Colors.black.withOpacity(0.3),
      blurRadius: 20,
      offset: const Offset(0, 4),
      spreadRadius: 0,
    ),
  ];
  
  static const Color hairlineBorder = Color.fromRGBO(255, 255, 255, 0.04);
  
  // ============================================
  // ANIMATIONS
  // ============================================
  
  static const Duration animationFast = Duration(milliseconds: 200);
  static const Duration animationNormal = Duration(milliseconds: 400);
  static const Duration animationSlow = Duration(milliseconds: 600);
  static const Duration animationVerySlow = Duration(milliseconds: 800);
  
  static const Curve animationCurve = Curves.easeOutCubic;
  static const Curve springCurve = Curves.easeOut;
  static const Curve calmCurve = Curves.easeInOutCubic;
  
  // ============================================
  // THEME DATA
  // ============================================
  
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: false,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: background,
      primaryColor: accent,
      fontFamily: fontFamily,
      
      // AppBar
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        systemOverlayStyle: SystemUiOverlayStyle.light,
        iconTheme: IconThemeData(color: textPrimary),
        titleTextStyle: sectionTitle,
      ),
      
      // Card
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusLarge),
        ),
      ),
      
      // Button
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: elevatedSurface,
          foregroundColor: textPrimary,
          elevation: 0,
          padding: const EdgeInsets.symmetric(
            horizontal: spacingMD,
            vertical: spacingSM,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusMedium),
          ),
          textStyle: body.copyWith(fontWeight: FontWeight.w500),
        ),
      ),
      
      // Text
      textTheme: const TextTheme(
        displayLarge: displayLarge,
        displayMedium: titleLarge,
        titleLarge: titleMedium,
        titleMedium: repoTitle,
        bodyLarge: bodyLarge,
        bodyMedium: bodyMedium,
        bodySmall: secondaryText,
        labelLarge: buttonText,
        labelMedium: tagText,
        labelSmall: metaText,
      ),
      
      // Divider
      dividerTheme: const DividerThemeData(
        color: divider,
        thickness: 1,
        space: 1,
      ),
      
      // Input
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: elevatedSurface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMedium),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMedium),
          borderSide: const BorderSide(color: divider),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMedium),
          borderSide: const BorderSide(color: accent, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: spacingMD,
          vertical: spacingMD,
        ),
      ),
    );
  }
}
