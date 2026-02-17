import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:markdown/markdown.dart' as md;
import 'package:url_launcher/url_launcher.dart';
import '../models/repository.dart';
import '../theme/app_theme.dart';

/// Premium README preview modal with Apple Maps-style sheet transition
class ReadmePreviewModal extends StatefulWidget {
  final Repository repo;
  final String? readmeContent;
  final VoidCallback? onSave;
  final VoidCallback? onOpenGitHub;

  const ReadmePreviewModal({
    super.key,
    required this.repo,
    this.readmeContent,
    this.onSave,
    this.onOpenGitHub,
  });

  @override
  State<ReadmePreviewModal> createState() => _ReadmePreviewModalState();
}

class _ReadmePreviewModalState extends State<ReadmePreviewModal>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<Offset> _slideAnimation;
  late Animation<double> _fadeAnimation;
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: AppTheme.animationNormal,
    );
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 1),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: AppTheme.animationCurve,
    ));
    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: AppTheme.animationCurve,
    ));
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _close() {
    _controller.reverse().then((_) {
      Navigator.of(context).pop();
    });
  }

  Future<void> _openGitHub() async {
    final url = Uri.parse(widget.repo.repoUrl);
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black.withOpacity(0.5),
      body: GestureDetector(
        onTap: _close,
        child: Container(
          color: Colors.transparent,
          child: SafeArea(
            child: GestureDetector(
              onTap: () {}, // Prevent closing when tapping inside
              child: SlideTransition(
                position: _slideAnimation,
                child: FadeTransition(
                  opacity: _fadeAnimation,
                  child: Container(
                    margin: const EdgeInsets.only(top: 60),
                    decoration: BoxDecoration(
                      color: AppTheme.surface,
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(AppTheme.radiusXLarge),
                        topRight: Radius.circular(AppTheme.radiusXLarge),
                      ),
                    ),
                    child: Column(
                      children: [
                        // Handle bar
                        _buildHandleBar(),
                        
                        // Repo header
                        _buildRepoHeader(),
                        
                        const Divider(color: AppTheme.divider),
                        
                        // README content
                        Expanded(
                          child: _buildReadmeContent(),
                        ),
                        
                        // Sticky bottom actions
                        _buildBottomActions(),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHandleBar() {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: AppTheme.spacingSM),
      width: 40,
      height: 4,
      decoration: BoxDecoration(
        color: AppTheme.textSecondary.withOpacity(0.3),
        borderRadius: BorderRadius.circular(2),
      ),
    );
  }

  Widget _buildRepoHeader() {
    return Padding(
      padding: const EdgeInsets.all(AppTheme.spacingMD),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.repo.name,
                  style: AppTheme.repoName,
                ),
                const SizedBox(height: 4),
                Text(
                  widget.repo.fullName,
                  style: AppTheme.meta,
                ),
              ],
            ),
          ),
          Row(
            children: [
              Icon(
                Icons.star_outline,
                size: 18,
                color: AppTheme.textSecondary,
              ),
              const SizedBox(width: 4),
              Text(
                _formatNumber(widget.repo.stars),
                style: AppTheme.meta,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildReadmeContent() {
    if (widget.readmeContent == null || widget.readmeContent!.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.article_outlined,
              size: 48,
              color: AppTheme.textSecondary,
            ),
            const SizedBox(height: AppTheme.spacingMD),
            Text(
              'No README available',
              style: AppTheme.body.copyWith(
                color: AppTheme.textSecondary,
              ),
            ),
          ],
        ),
      );
    }

    return Markdown(
      controller: _scrollController,
      data: widget.readmeContent!,
      styleSheet: _buildMarkdownStyleSheet(),
      onTapLink: (text, href, title) {
        if (href != null) {
          launchUrl(Uri.parse(href), mode: LaunchMode.externalApplication);
        }
      },
      builders: {
        'code': CodeElementBuilder(),
      },
    );
  }

  MarkdownStyleSheet _buildMarkdownStyleSheet() {
    return MarkdownStyleSheet(
      // Text styles
      p: AppTheme.body,
      h1: AppTheme.sectionTitle,
      h2: AppTheme.repoName,
      h3: AppTheme.body.copyWith(fontWeight: FontWeight.w600),
      h4: AppTheme.body.copyWith(fontWeight: FontWeight.w500),
      h5: AppTheme.body,
      h6: AppTheme.meta,
      
      // Colors
      pPadding: const EdgeInsets.only(bottom: AppTheme.spacingMD),
      h1Padding: const EdgeInsets.only(
        top: AppTheme.spacingLG,
        bottom: AppTheme.spacingMD,
      ),
      h2Padding: const EdgeInsets.only(
        top: AppTheme.spacingMD,
        bottom: AppTheme.spacingSM,
      ),
      h3Padding: const EdgeInsets.only(
        top: AppTheme.spacingMD,
        bottom: AppTheme.spacingSM,
      ),
      
      // Links
      a: AppTheme.body.copyWith(
        color: AppTheme.accent,
        decoration: TextDecoration.underline,
      ),
      
      // Code
      code: AppTheme.meta.copyWith(
        backgroundColor: AppTheme.divider,
        fontFamily: 'monospace',
      ),
      codeblockDecoration: BoxDecoration(
        color: AppTheme.divider,
        borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
      ),
      codeblockPadding: const EdgeInsets.all(AppTheme.spacingMD),
      
      // Lists
      listBullet: AppTheme.body,
      listIndent: AppTheme.spacingMD,
      
      // Blockquote
      blockquote: AppTheme.body.copyWith(
        color: AppTheme.textSecondary,
        fontStyle: FontStyle.italic,
      ),
      blockquoteDecoration: BoxDecoration(
        border: Border(
          left: BorderSide(
            color: AppTheme.accent,
            width: 3,
          ),
        ),
      ),
      blockquotePadding: const EdgeInsets.only(
        left: AppTheme.spacingMD,
        top: AppTheme.spacingSM,
        bottom: AppTheme.spacingSM,
      ),
      
      // Horizontal rule
      horizontalRuleDecoration: BoxDecoration(
        border: Border(
          top: BorderSide(
            color: AppTheme.divider,
            width: 1,
          ),
        ),
      ),
    );
  }

  Widget _buildBottomActions() {
    return Container(
      padding: const EdgeInsets.all(AppTheme.spacingMD),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        border: Border(
          top: BorderSide(
            color: AppTheme.divider,
            width: 1,
          ),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: widget.onSave,
                icon: const Icon(Icons.bookmark_outline, size: 20),
                label: const Text('Save'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppTheme.textPrimary,
                  side: const BorderSide(color: AppTheme.divider),
                  padding: const EdgeInsets.symmetric(
                    vertical: AppTheme.spacingMD,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                  ),
                ),
              ),
            ),
            const SizedBox(width: AppTheme.spacingSM),
            Expanded(
              child: ElevatedButton.icon(
                onPressed: _openGitHub,
                icon: const Icon(Icons.open_in_new, size: 20),
                label: const Text('Open GitHub'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.accent,
                  foregroundColor: AppTheme.textPrimary,
                  padding: const EdgeInsets.symmetric(
                    vertical: AppTheme.spacingMD,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatNumber(int number) {
    if (number >= 1000) {
      return '${(number / 1000).toStringAsFixed(1)}k';
    }
    return number.toString();
  }
}

/// Custom code block builder with copy functionality
class CodeElementBuilder extends MarkdownElementBuilder {
  @override
  Widget? visitElementAfter(md.Element element, TextStyle? preferredStyle) {
    final text = element.textContent;
    if (text.isEmpty) return null;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: AppTheme.spacingXS),
      padding: const EdgeInsets.all(AppTheme.spacingMD),
      decoration: BoxDecoration(
        color: AppTheme.divider,
        borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: SelectableText(
              text,
              style: AppTheme.meta.copyWith(
                fontFamily: 'monospace',
                color: AppTheme.textPrimary,
              ),
            ),
          ),
          IconButton(
            icon: const Icon(
              Icons.copy_outlined,
              size: 18,
              color: AppTheme.textSecondary,
            ),
            onPressed: () {
              Clipboard.setData(ClipboardData(text: text));
              // Show snackbar would be handled by parent
            },
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
          ),
        ],
      ),
    );
  }
}
