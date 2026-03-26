# Limonium

A Hugo static site with Pages CMS integration.

## Setup

This project uses:
- **Hugo** (v0.154.5+) - Static site generator
- **Pages CMS** - GitHub-native CMS
- **Cloudflare Pages** - Hosting

## Getting Started

### Local Development

**Quick start:**
```bash
# first time only:
# cp .env.example .env.local && edit .env.local
./hugo-start
```

Or use the longer script:
```bash
./dev.sh
```

Or manually:
```bash
hugo server --buildDrafts
```

**Access your site:**
- Main site: http://localhost:1313
- CMS entry page: http://localhost:1313/admin/ (links to Pages CMS)

### Adding a Theme

To add a Hugo theme:

```bash
# Add theme as submodule
git submodule add https://github.com/theme-author/theme-name.git themes/theme-name

# Or clone directly
cd themes
git clone https://github.com/theme-author/theme-name.git

# Then update hugo.toml
echo 'theme = "theme-name"' >> hugo.toml
```

Browse themes at: https://themes.gohugo.io/

## Pages CMS Configuration

Pages CMS is configured in `.pages.yml` at the repository root.

Managed content currently includes localized homepage files:
- `content/_index.it.md`
- `content/_index.en.md`

### Using Pages CMS

1. Go to [Pages CMS app](https://app.pagescms.org).
2. Sign in with GitHub.
3. Select this repository and the branch you want to edit.
4. Edit content from the configured entries and commit changes.

### Cloudflare Pages deployment

Cloudflare Pages hosts the Hugo site build, while Pages CMS writes content directly to GitHub.

Recommended Cloudflare Pages build settings:
- Build command: `hugo`
- Build output directory: `public`

## Project Structure

```
limonium/
├── archetypes/      # Content templates
├── assets/          # Assets to be processed by Hugo
├── content/         # Site content
│   ├── _index.it.md  # Homepage content (Italian)
│   ├── _index.en.md  # Homepage content (English)
│   └── shop/         # Shop page content
├── data/            # Data files
├── layouts/         # Custom layouts
├── static/          # Static files (CSS, JS, images)
│   ├── admin/      # CMS entry page
│   └── images/     # Uploaded media
├── themes/          # Hugo themes
├── .pages.yml       # Pages CMS configuration
└── hugo.toml        # Hugo configuration
```

## Building

```bash
# Build site
hugo

# Build with drafts
hugo --buildDrafts

# Build for production
hugo --minify
```

## Resources

- [Hugo Documentation](https://gohugo.io/documentation/)
- [Pages CMS Documentation](https://pagescms.org/docs/)
- [Hugo Themes](https://themes.gohugo.io/)

## Shopify integration

This project includes a `/shop` page that loads products from Shopify Storefront API.

Full setup steps are in `SHOPIFY_SETUP.md`.

Admin OAuth helper scripts:
- `scripts/shopify-get-admin-token.sh`
- `scripts/shopify-query-admin-products.sh`
