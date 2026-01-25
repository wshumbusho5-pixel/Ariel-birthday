const puppeteer = require('puppeteer');
const path = require('path');

async function generatePDF() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Set viewport for mobile-friendly flyer
    await page.setViewport({ width: 600, height: 1000 });

    // Load the flyer
    const flyerPath = path.join(__dirname, 'flyer.html');
    await page.goto(`file://${flyerPath}`, { waitUntil: 'networkidle0' });

    // Wait for animations to settle
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate PDF
    await page.pdf({
        path: 'ariel-birthday-flyer.pdf',
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });

    console.log('PDF saved as ariel-birthday-flyer.pdf');

    // Also generate a PNG image for social media
    await page.screenshot({
        path: 'ariel-birthday-flyer.png',
        fullPage: true,
        type: 'png'
    });

    console.log('PNG saved as ariel-birthday-flyer.png');

    await browser.close();
}

generatePDF().catch(console.error);
