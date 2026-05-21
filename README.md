# GWX Voucher Generator

A sleek, client-side web application for generating customized and printable vouchers. Built with standard web technologies (HTML, CSS, JavaScript) for maximum portability and performance.

## Features

- **Authentication**: Secure Sign In and Sign Up flows with "Remember Me" functionality.
- **Voucher Generation**: Fill out custom details (Date, Valid Till, Customer Name, Cost Center, Description, Amount).
- **Dynamic Previews**: See a real-time preview of the generated voucher overlaid onto a branded background template.
- **History & Tracking**: Stores a history of generated vouchers using browser local storage.
- **Print Optimization**: Dedicated print styles ensure that only the selected voucher is printed in high quality, without any UI clutter.
- **Production Ready**: Assets are cleanly separated (CSS, JS, Images) for optimal caching and fast load times.

## Local Development

Since this is a static site without backend dependencies, you can simply clone the repository and open `index.html` in any modern web browser.

For an optimal experience (especially with local storage and module loading if added later), run a local development server:

```bash
# Using Node.js / npx
npx serve .

# Or using Python
python -m http.server 8000
```

## Deployment on Vercel

This project is fully ready to be hosted on Vercel as a static site.

1. Push the code to a GitHub repository.
2. Log in to [Vercel](https://vercel.com).
3. Click **Add New** > **Project**.
4. Import your GitHub repository.
5. Vercel will automatically detect it as a static site and deploy `index.html`.
6. Click **Deploy**.

## Tech Stack

- **HTML5** (Semantic structure)
- **CSS3** (Custom properties, Flexbox, Grid, Print Media Queries)
- **JavaScript (ES6)** (State management, DOM manipulation, LocalStorage)

## Architecture

- `index.html`: The main entry point containing the UI layout.
- `assets/css/styles.css`: All styling, themes, and print layouts.
- `assets/js/app.js`: Application logic and state management.
- `assets/img/`: Contains logos and voucher templates.
