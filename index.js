
import puppeteerExtra from "puppeteer-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import chromium from "@sparticuz/chromium";
import { v4 as uuidv4 } from 'uuid';
import { updateDoc, arrayUnion, doc } from 'firebase/firestore';
import { db } from "./firebase.js";
import { collection, addDoc } from "firebase/firestore";

let results = [];

export const handler = async (event) => {
    const body = JSON.parse(event.body)
    const { url, list } = body
    const results = await GScrape(url, list)
    
    return {
        statusCode: 200,
        body: JSON.stringify(results)
    }
}

async function GScrape(url, list) {

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
        headless: "new",
    })
    
    const page = await browser.newPage();
    await page.goto(url, { timeout: 60000 });
    await page.waitForTimeout(3000);

    const paginateNumber = 20;

    let links = await page.$$eval('a.fl', as => as.map(a => a.href));

    try {
        for (let i = 0; i < paginateNumber; i++) {
            await page.waitForTimeout(1500);
            const elements = await page.$$('div[jscontroller="AtSb"]')
            await scrape(elements, list, url);
            const link = links[i];
            await page.goto(link, { timeout: 60000 });
        }
    } catch {
        console.log("No more pages");
        return results
    }

}

async function scrape(elements, list, url) {

    const userRef = doc(db, `sheets/${list}`)

    for (let i = 0; i < elements.length; i++) {

        let siteLink, address, phoneNumber

        const element = elements[i];
        const name = await element.$eval('span.OSrXXb', node => node.innerText).catch(() => "");
        const rating = await element.$eval('span.yi40Hd', node => node.innerText).catch(() => "");
        const totalReviewsCrude = await element.$eval('span.RDApEe', node => node.innerText).catch(() => "");
        const ratings = totalReviewsCrude.replace(/\(|\)/g, "");


        const website = await element.$eval('a.L48Cpd', node => node.href).catch(() => "");
        const directions = await element.$eval('a.VByer', node => node.getAttribute('data-url')).catch(() => "");
        
        try {
            const details = await element.$('div.rllt__details');
            const misc = await details.$eval('div:nth-child(3)', node => node.innerText).catch(() => "");
            const misc2 = await details.$eval('div:nth-child(4)', node => node.innerText).catch(() => "");
            const misc3 = misc + misc2;
            const phoneRegex = /(\d{3})\D*(\d{3})\D*(\d{4})/;
            phoneNumber = misc3.match(phoneRegex)[0];
            phoneNumber = phoneNumber.replace(/\D/g, "");
        } catch {
            phoneNumber = "";
        }

        try {
            const crudeAddress = directions.replace(/\+/g, " ");
            const titleLast = name.split(" ").slice(-1)[0] + ", "
            const betterAddress = crudeAddress.split(titleLast)[1]
            address = betterAddress.split("/data")[0]
            const addressPieces = address.split(" ");
            const filteredAddress = addressPieces.filter(piece => !piece.includes("%"));
            address = filteredAddress.join(" ");
        } catch {
            address = "";
        }

        if (website) {
            const webUrl = new URL(website);
            siteLink = webUrl.hostname;
            // if siteLink includes "facebook"
            if (siteLink.includes("facebook")) {
                try{
                    siteLink = website.split("//")[1];
                } catch {
                    siteLink = "";
                }
            }

        } else {
            siteLink = "";
        }

        if (name === "") {
            continue;
        }        

        const sheetItemId = uuidv4();

        const data = { name, rating, ratings, phoneNumber, siteLink, address, performance_score: 0, sheetItemId: sheetItemId, email: "" }
        results.push(data);
        console.log(data)

        await updateDoc(userRef, {
            lists: arrayUnion(data)
        })
        
        await addDoc(collection(db, "queue"), {
            list_id: list_id,
            facebook: facebook,
            obj_id: obj_id
        });

    }
}

// GScrape("https://www.google.com/search?tbm=lcl&q=construction+companies+in+chicago#rlfi=hd:;start:0", "Cgn1TFR8wZ8R9EMMjqf8")

// handler({
//     body: JSON.stringify({
//         url: "https://www.google.com/search?tbm=lcl&q=plumbers+in+provo+utah#rlfi=hd:;start:0",
//         list: "zQXOkToFI2waELTHssAO"
//     }),
// })





