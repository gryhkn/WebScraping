import puppeteer from "puppeteer";
import moment from "moment";
import express from "express";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

const secretToken = "my-secret-token";

async function scrapeProductData(url, from_date) {
  const fromDate = moment(from_date, "YYYY-MM-DD").toDate();
  // Launch a new Chrome browser
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  // Create a new page
  const page = await browser.newPage();

  // Navigate to the specified URL
  await page.goto(url);
  await page.waitForTimeout(2000); // Wait for a specific amount of time

  // Wait for the modal to appear
  try {
    await page.waitForSelector("selector", { hidden: true, timeout: 0 });
    // Click the "accept" button
    await page.click("#onetrust-accept-btn-handler");
    await page.waitForTimeout(2000); // Wait for a specific amount of time
  } catch (err) {
    // Selector mevcut değil, es geç
    console.log("Selector mevcut değil, es geç");
  }

  let date_string = await page.$eval('time[itemprop="datePublished"]', (el) =>
    el.getAttribute("datetime")
  );
  console.log("date_string:", date_string);

  let date_object = moment(date_string).format("YYYY-MM-DD");
  date_object = moment(date_object).toDate();

  if (fromDate > date_object) {
    console.log("Başka yorum yok gibi.");
    await browser.close();

    return "Başka yorum yok.";
  }

  let previousDivCount = 0;
  let data = {};
  let index = 1;

  while (true) {
    const elements = await page.$$eval(
      'time[itemprop="datePublished"]',
      (elements) => elements
    );

    if (elements.length > 0) {
      const lastElement = elements[elements.length - 1];
      const lastElementDate = lastElement.datetime;
      const lastElementDateTime = moment(lastElementDate).toDate();

      if (fromDate > lastElementDateTime) {
        console.log("Bu sayfa iyidir");
        break;
      }

      // Select the button element you want to click

      const button = await page.$(
        "a.btn.btn-light.btn-lg[data-id=load-more-opinions]"
      );

      if (button) {
        // Scroll to the button element
        await page.evaluate((button) => {
          window.scrollTo(0, button.offsetTop);
        }, button);

        await page.waitForTimeout(2000); // Wait for a specific amount of time

        // Click the button
        await button.click();
        await page.waitForTimeout(3000); // Wait for a specific amount of time
      } else {
        break;
      }
    } else {
      console.log("Bir hata oluştu, istenen elementler yok.");
      break;
    }
  }

  const comments = await page.$$eval(
    "div[data-test-id=opinion-block][itemprop=review]",
    (divs) => {
      return divs.map((div) => {
        const name = div
          .querySelector('span[itemprop="name"]')
          .textContent.trim();
        const verification_status = div
          .querySelector("span.text-muted.small")
          .textContent.trim();

        let date_published = div
          .querySelector('time[itemprop="datePublished"]')
          .getAttribute("datetime");

        console.log("date_published in comments:", date_published);
        const doctor_name = div
          .querySelector('meta[itemprop="name"]')
          .getAttribute("content");
        const review_text = div
          .querySelector('p[itemprop="description"]')
          .textContent.trim();
        return {
          name,
          verification_status,
          date_published,
          doctor_name,
          review_text,
        };
      });
    }
  );

  //Write a for loop for above foreach loop
  for (let ojbect of comments) {
    if (ojbect.verification_status === "Doğrulanmış kullanıcı") {
      ojbect.verification_status = true;
    } else {
      ojbect.verification_status = false;
    }
    ojbect.date_published = moment(ojbect.date_published).format("YYYY-MM-DD");
    ojbect.date_published = moment(ojbect.date_published).toDate();

    if (fromDate > ojbect.date_published) {
      console.log("Yeni tarihli yorum yok.");
      break;
    }
    ojbect.date_published = moment(ojbect.date_published).format("YYYY-MM-DD");

    data[index] = ojbect;
    index++;
  }

  console.log(data);
  await browser.close();
  return data;
}

app.post("/", async (req, res) => {
  const token = req.headers.authorization;
  if (token !== secretToken) {
    res.status(401).send("Unauthorized");
    return;
  }

  const url = req.body.url;
  const from_date = req.body.from_date;
  const data = await scrapeProductData(url, from_date);
  res.send(data);
});

app.listen(3000, () => {
  console.log("API listening on port 3000!");
});
