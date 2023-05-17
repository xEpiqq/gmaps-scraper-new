import puppeteerExtra from "puppeteer-extra"
import stealthPlugin from "puppeteer-extra-plugin-stealth"
import chromium from "@sparticuz/chromium"
import { v4 as uuidv4 } from 'uuid';
import { updateDoc, arrayUnion, doc } from 'firebase/firestore';
import { db } from "./firebase.js"


async function scrape(url, list) {

    const userRef = doc(db, `sheets/${list}`)

    puppeteerExtra.use(stealthPlugin())

    const browser = await puppeteerExtra.launch({
        headless: false,
        executablePath: "/usr/bin/google-chrome"
    })

    // const browser = await puppeteerExtra.launch({
    //     args: chromium.args,
    //     defaultViewport: chromium.defaultViewport,
    //     executablePath: await chromium.executablePath(),
    //     ignoreHTTPSErrors: true,
    //     headless: chromium.headless,
    // })

    const page = await browser.newPage()
    await page.goto(url)
    await page.waitForTimeout(2000)
    const divs = await page.$$('div[jscontroller="AtSb"]')
    // shuffle the array
    for (let i = divs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [divs[i], divs[j]] = [divs[j], divs[i]];
    }


    for (const div of divs) {
        await div.click()
        const randomIntervalOne = Math.floor(Math.random() * (2500 - 1500 + 1) + 1500 )
        await page.waitForTimeout(randomIntervalOne)

        const business_name = await page.$eval('div[class="SPZz6b"]', (el) => el.innerText).catch(() => 'none');
        const website = await page.$eval('a[class="dHS6jb"]', (el) => el.href).catch(() => 'none');
        const address = await page.$eval('span[class="LrzXr"]', (el) => el.innerText).catch(() => 'none');
        const phone_number = await page.$eval('a[jscontroller="LWZElb"]', (el) => el.innerText).catch(() => 'none');
        const rating_content = await page.$eval('div[class="Ob2kfd"]', (el) => el.innerText).catch(() => 'none');

        const [ratingStr, numberStr] = rating_content.split('(')
        const pure_rating = parseFloat(ratingStr)
        const ratings_count = parseInt(numberStr.replace(/\(|\)/g, ''))
        
        let stripped_url = website ? website.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0] : '';
        const obj = uuidv4()

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
            obj: obj,
        }

        await updateDoc(userRef, {
            lists: arrayUnion(newSheet)
        })

        const randomInterval = Math.floor(Math.random() * (700 - 300 + 1) + 300)
        await page.waitForTimeout(randomInterval)

        fetch('https://lu95yfsix7.execute-api.us-west-2.amazonaws.com/default/scavenger-site-scraper', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                list_id: list,
                url_i: stripped_url,
                obj_id: obj,
            }),
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
    await scrape(url, list)
    
    return {
        statusCode: 200,
        body: JSON.stringify({ message: "consider it scraped"})
    }
}

handler({
    body: JSON.stringify({
        url: "https://www.google.com/search?tbm=lcl&q=plumbers+in+provo+utah#rlfi=hd:;start:20",
        list: "eaea"
    }),
})