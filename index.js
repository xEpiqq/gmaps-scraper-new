import puppeteerExtra from "puppeteer-extra"
import stealthPlugin from "puppeteer-extra-plugin-stealth"
import chromium from "@sparticuz/chromium"
import { v4 as uuidv4 } from 'uuid';
import { updateDoc, arrayUnion, doc } from 'firebase/firestore';
import { db } from "./firebase.js"


async function scrape(url, userRef) {

    puppeteerExtra.use(stealthPlugin())

    // const browser = await puppeteerExtra.launch({
    //     headless: false,
    //     executablePath: "/usr/bin/google-chrome"
    // })

    const browser = await puppeteerExtra.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        ignoreHTTPSErrors: true,
        headless: chromium.headless,
    })

    const page = await browser.newPage()
    await page.goto(url)
    await page.waitForTimeout(2000)
    const divs = await page.$$('div[jscontroller="AtSb"]')


    for (const div of divs) {
        await div.click()
        await page.waitForTimeout(2000)
        const business_name = await page.$eval('div[class="SPZz6b"]', (el) => el.innerText).catch(() => 'none');
        const website = await page.$eval('a[class="dHS6jb"]', (el) => el.href).catch(() => 'none');
        const address = await page.$eval('span[class="LrzXr"]', (el) => el.innerText).catch(() => 'none');
        const phone_number = await page.$eval('a[jscontroller="LWZElb"]', (el) => el.innerText).catch(() => 'none');
        const rating_content = await page.$eval('div[class="Ob2kfd"]', (el) => el.innerText).catch(() => 'none');

        const [ratingStr, numberStr] = rating_content.split('(')
        const pure_rating = parseFloat(ratingStr)
        const ratings_count = parseInt(numberStr.replace(/\(|\)/g, ''))
        
        let stripped_url = website ? website.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0] : '';

        const newSheet = { 
            biz: business_name,
            site: stripped_url, 
            phone: phone_number,
            address: address, 
            email: "none", 
            rating: pure_rating,
            ratings: ratings_count,
            template: "none",
            score: 0,
            obj: uuidv4(),
        }

        await updateDoc(userRef, {
            lists: arrayUnion(newSheet)
        })

    }
    
    const pages = await browser.pages()
    await Promise.all(pages.map((page) => page.close()))
    await browser.close()
    return
}



    
export const handler = async (event) => {
    const body = JSON.parse(event.body)
    const { url, list } = body
    const userRef = doc(db, `sheets/${list}`)
    await scrape(url, userRef)
    
    return {
        statusCode: 200,
        body: JSON.stringify({ message: "consider it scraped"})
    }
}

// handler({
//     body: JSON.stringify({
//         url: "https://www.google.com/search?tbm=lcl&q=plumbers+in+provo+utah#rlfi=hd:;start:20",
//         list: "eee"
//     }),
// })