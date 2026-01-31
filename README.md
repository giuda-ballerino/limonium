# Limonium

A Hugo static site with Decap CMS integration.

## Setup

This project uses:
- **Hugo** (v0.154.5+) - Static site generator
- **Decap CMS** (v3.0.0+) - Git-based CMS

## Getting Started

### Local Development

**Quick start:**
```bash
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
- CMS Admin: http://localhost:1313/admin/

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

## Decap CMS Configuration

The CMS is configured in `static/admin/config.yml`. Currently set up for:
- **Backend**: Git Gateway (requires Netlify or similar hosting)
- **Collections**: Blog posts in `content/blog/`

### To Use Decap CMS in Production

1. **Deploy to Netlify:**
   - Connect your Git repository
   - Build command: `hugo`
   - Publish directory: `public`

2. **Enable Netlify Identity & Git Gateway:**
   - Go to Site Settings → Identity
   - Enable Identity service
   - Enable Git Gateway under Services

3. **Access CMS:**
   - Navigate to `https://your-site.netlify.app/admin/`
   - Log in with Netlify Identity

### Alternative Backends

For local development or other backends, update `static/admin/config.yml`:
- **Local backend**: `name: local_backend` (for testing without Git)
- **GitHub backend**: `name: github` (requires OAuth app)
- **GitLab backend**: `name: gitlab` (requires OAuth app)

See [Decap CMS documentation](https://decapcms.org/docs/backends-overview/) for more options.

## Project Structure

```
limonium/
├── archetypes/      # Content templates
├── assets/          # Assets to be processed by Hugo
├── content/         # Site content
│   └── blog/       # Blog posts
├── data/            # Data files
├── layouts/         # Custom layouts
├── static/          # Static files (CSS, JS, images)
│   ├── admin/      # Decap CMS files
│   └── images/     # Uploaded media
├── themes/          # Hugo themes
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
- [Decap CMS Documentation](https://decapcms.org/docs/)
- [Hugo Themes](https://themes.gohugo.io/)
