import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/repository.dart';
import '../theme/app_theme.dart';

/// Premium Apple-style repo card
class PremiumRepoCard extends StatelessWidget {
  final Repository repo;
  final VoidCallback? onTap;
  final VoidCallback? onSave;
  final VoidCallback? onPreview;

  const PremiumRepoCard({
    super.key,
    required this.repo,
    this.onTap,
    this.onSave,
    this.onPreview,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(
          horizontal: AppTheme.spacingMD,
          vertical: AppTheme.spacingSM,
        ),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
          border: Border.all(
            color: AppTheme.hairlineBorder,
            width: 1,
          ),
          boxShadow: AppTheme.cardShadow,
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
            child: Padding(
              padding: const EdgeInsets.all(AppTheme.spacingMD + 4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Owner header
                  _buildOwnerHeader(),
                  const SizedBox(height: AppTheme.spacingMD),
                  
                  // Repo name
                  _buildRepoName(),
                  const SizedBox(height: AppTheme.spacingSM),
                  
                  // Description
                  if (repo.description != null && repo.description!.isNotEmpty)
                    _buildDescription(),
                  if (repo.description != null && repo.description!.isNotEmpty)
                    const SizedBox(height: AppTheme.spacingMD),
                  
                  // Tags
                  if (repo.topics.isNotEmpty) _buildTags(),
                  if (repo.topics.isNotEmpty) const SizedBox(height: AppTheme.spacingMD),
                  
                  // Stats row
                  _buildStatsRow(),
                  const SizedBox(height: AppTheme.spacingMD),
                  
                  // Primary action button
                  _buildSaveButton(),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildOwnerHeader() {
    return Row(
      children: [
        // Avatar
        ClipOval(
          child: CachedNetworkImage(
            imageUrl: repo.ownerAvatar ?? '',
            width: 40,
            height: 40,
            fit: BoxFit.cover,
            placeholder: (context, url) => Container(
              width: 40,
              height: 40,
              color: AppTheme.divider,
            ),
            errorWidget: (context, url, error) => Container(
              width: 40,
              height: 40,
              color: AppTheme.divider,
              child: const Icon(
                Icons.person_outline,
                color: AppTheme.textSecondary,
                size: 20,
              ),
            ),
          ),
        ),
        const SizedBox(width: AppTheme.spacingSM),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                repo.ownerLogin,
                style: AppTheme.meta.copyWith(
                  color: AppTheme.textSecondary,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                repo.fullName,
                style: AppTheme.meta.copyWith(
                  color: AppTheme.textSecondary,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildRepoName() {
    return Text(
      repo.name,
      style: AppTheme.repoName,
      maxLines: 2,
      overflow: TextOverflow.ellipsis,
    );
  }

  Widget _buildDescription() {
    return Text(
      repo.description!,
      style: AppTheme.body.copyWith(
        color: AppTheme.textSecondary,
      ),
      maxLines: 3,
      overflow: TextOverflow.ellipsis,
    );
  }

  Widget _buildTags() {
    return Wrap(
      spacing: AppTheme.spacingXS + 2,
      runSpacing: AppTheme.spacingXS + 2,
      children: repo.topics.take(5).map((topic) {
        return Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppTheme.spacingSM,
            vertical: AppTheme.spacingXS + 2,
          ),
          decoration: BoxDecoration(
            color: AppTheme.divider,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            topic,
            style: AppTheme.meta.copyWith(
              fontSize: 12,
              color: AppTheme.textSecondary,
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildStatsRow() {
    return Row(
      children: [
        _buildStat(
          icon: Icons.star_outline,
          value: _formatNumber(repo.stars),
          color: AppTheme.textSecondary,
        ),
        const SizedBox(width: AppTheme.spacingMD),
        _buildStat(
          icon: Icons.call_split_outlined,
          value: _formatNumber(repo.forks),
          color: AppTheme.textSecondary,
        ),
        if (repo.language != null) ...[
          const SizedBox(width: AppTheme.spacingMD),
          _buildStat(
            icon: Icons.circle,
            value: repo.language!,
            color: AppTheme.textSecondary,
            iconSize: 8,
          ),
        ],
        const Spacer(),
        Text(
          repo.timeAgo,
          style: AppTheme.meta,
        ),
      ],
    );
  }

  Widget _buildStat({
    required IconData icon,
    required String value,
    required Color color,
    double iconSize = 16,
  }) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          icon,
          size: iconSize,
          color: color,
        ),
        const SizedBox(width: 4),
        Text(
          value,
          style: AppTheme.meta.copyWith(color: color),
        ),
      ],
    );
  }

  Widget _buildSaveButton() {
    return SizedBox(
      width: double.infinity,
      height: 48,
      child: ElevatedButton(
        onPressed: onSave,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.elevatedSurface,
          foregroundColor: AppTheme.textPrimary,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
          ),
          padding: EdgeInsets.zero,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.bookmark_outline,
              size: 20,
            ),
            const SizedBox(width: AppTheme.spacingXS + 2),
            Text(
              'Save',
              style: AppTheme.body.copyWith(
                fontWeight: FontWeight.w500,
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
