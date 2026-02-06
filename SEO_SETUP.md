# SEO & Search Engine Indexing Setup Guide

This guide will help you set up your website for search engine optimization (SEO) and indexing.

## What's Included

✅ **Meta Tags** - Open Graph, Twitter Cards, and standard SEO tags  
✅ **robots.txt** - Tells search engines which pages to crawl  
✅ **sitemap.xml** - Lists all important pages for search engines  
✅ **Dynamic SEO** - Meta tags update automatically for each route  
✅ **Structured Data Ready** - Foundation for rich snippets

## Setup Steps

### 1. Update Your Domain

Replace `yourdomain.com` with your actual domain in these files:

**`public/robots.txt`:**
```txt
Sitemap: https://yourdomain.com/sitemap.xml
```

**`public/sitemap.xml`:**
Replace all instances of `https://yourdomain.com/` with your actual domain.

**`index.html`:**
Update all meta tag URLs:
- `og:url`
- `twitter:url`
- `canonical` link
- `og:image` (if you have one)

**`src/utils/seo.ts`:**
Update the `image` default URL in the `updateSEO` function.

### 2. Create Open Graph Image (Optional but Recommended)

Create an `og-image.png` (1200x630px) and place it in the `public` folder. This image appears when your site is shared on social media.

**Recommended Tools:**
- [Canva](https://www.canva.com/) - Free design tool
- [Figma](https://www.figma.com/) - Professional design tool

**Image Specifications:**
- Size: 1200x630 pixels
- Format: PNG or JPG
- File size: Under 1MB
- Content: Your logo + tagline or app screenshot

### 3. Submit to Search Engines

#### Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add your property (your domain)
3. Verify ownership (DNS record or HTML file)
4. Submit your sitemap: `https://yourdomain.com/sitemap.xml`
5. Request indexing for your main pages

#### Bing Webmaster Tools

1. Go to [Bing Webmaster Tools](https://www.bing.com/webmasters)
2. Add your site
3. Verify ownership
4. Submit your sitemap

### 4. Verify SEO is Working

**Test Your Meta Tags:**
- Use [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) to test Open Graph tags
- Use [Twitter Card Validator](https://cards-dev.twitter.com/validator) to test Twitter Cards
- Use [Google Rich Results Test](https://search.google.com/test/rich-results) for structured data

**Check robots.txt:**
Visit: `https://yourdomain.com/robots.txt`

**Check sitemap:**
Visit: `https://yourdomain.com/sitemap.xml`

## What Gets Indexed

### Main Pages (in sitemap.xml)
- `/` - Home/Discover page
- `/discover` - Repository discovery
- `/trending` - Trending repositories
- `/agent` - AI-powered recommendations
- `/profile` - User profile
- `/support` - Support page

### Dynamic Routes
- `/r/:owner/:repo` - Individual repository pages (tracked via Google Analytics)

## SEO Features

### Automatic Meta Tag Updates
Meta tags automatically update when users navigate between pages:
- Title tags
- Descriptions
- Open Graph tags
- Twitter Cards
- Canonical URLs

### Search Engine Friendly
- ✅ All pages are crawlable
- ✅ Clean URLs (no hash routing)
- ✅ Fast loading times
- ✅ Mobile-responsive
- ✅ Semantic HTML structure

## Monitoring

### Google Search Console
Monitor:
- **Coverage** - Which pages are indexed
- **Performance** - Search rankings and clicks
- **Mobile Usability** - Mobile-friendly issues
- **Core Web Vitals** - Page speed metrics

### Google Analytics
Track:
- Organic search traffic
- User behavior from search
- Conversion rates

## Best Practices

1. **Keep Content Fresh** - Update your sitemap when adding new pages
2. **Monitor Indexing** - Check Search Console regularly
3. **Fix Errors** - Address any crawl errors promptly
4. **Optimize Images** - Use alt text and optimize file sizes
5. **Page Speed** - Keep load times under 3 seconds

## Troubleshooting

### Pages Not Being Indexed

1. **Check robots.txt** - Make sure pages aren't blocked
2. **Verify sitemap** - Ensure sitemap.xml is accessible
3. **Request Indexing** - Use Google Search Console to request indexing
4. **Check for Errors** - Look for crawl errors in Search Console

### Meta Tags Not Updating

1. **Clear Cache** - Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
2. **Check Console** - Look for JavaScript errors
3. **Verify Route** - Make sure route is in `routeSEO` object in `seo.ts`

### Social Sharing Not Working

1. **Test with Debuggers** - Use Facebook/Twitter debuggers
2. **Check Image URL** - Ensure og-image.png is accessible
3. **Verify Meta Tags** - Use browser DevTools to inspect meta tags

## Next Steps

1. ✅ Update domain in all files
2. ✅ Create og-image.png
3. ✅ Submit to Google Search Console
4. ✅ Submit to Bing Webmaster Tools
5. ✅ Monitor indexing status
6. ✅ Optimize based on Search Console data

## Additional Resources

- [Google Search Central](https://developers.google.com/search)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [Schema.org](https://schema.org/) - For structured data (future enhancement)
