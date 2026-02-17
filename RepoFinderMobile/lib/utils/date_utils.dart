import 'package:intl/intl.dart';

class DateUtils {
  static String formatTimeAgo(DateTime? date) {
    if (date == null) return 'Unknown';
    
    final now = DateTime.now();
    final difference = now.difference(date);
    
    if (difference.inDays > 365) {
      final years = (difference.inDays / 365).floor();
      return '${years}y ago';
    } else if (difference.inDays > 30) {
      final months = (difference.inDays / 30).floor();
      return '${months}mo ago';
    } else if (difference.inDays > 0) {
      return '${difference.inDays}d ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'just now';
    }
  }

  static String formatTimeAgoFromString(String? dateString) {
    if (dateString == null || dateString.isEmpty) return 'Unknown';
    
    try {
      final date = DateTime.parse(dateString);
      return formatTimeAgo(date);
    } catch (e) {
      return 'Unknown';
    }
  }
}
