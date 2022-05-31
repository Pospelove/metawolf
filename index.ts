import * as nut from "@nut-tree/nut-js";
import * as nutTemplateMatcher from "@nut-tree/template-matcher";
import * as fs from "fs";
import CDP from "chrome-remote-interface";
import * as cri from "chrome-remote-interface";
import * as xml from "fast-xml-parser";

// TODO: Refactor globals
let totalApplications = 0;
let applications = new Array<JobInfoParsed>();

const findAndClick = async (image: string) => {
  const res = { success: false };
  try {
    await nut.mouse.move(
      nut.straightTo(
        nut.centerOf(
          nut.screen.find(
            nut.imageResource(image), { confidence: 0.989 }
          )
        )
      )
    );
    await nut.mouse.click(nut.Button.LEFT);
    res.success = true;
  }
  catch (e) {
    const notFoundStr = "No match with required confidence";
    const knownException = `${e}`.indexOf(notFoundStr) !== -1;
    if (!knownException) {
      throw e;
    }
    else {
      console.log(e);
    }
  }
  console.log("Clicked " + image + " success = " + res.success);
  return res;
}

interface ChromeConnectSuccess {
  success: true,
  client: cri.Client
}

interface ChromeConnectError {
  success: false,
  error: string,
}

type ChromeConnect = ChromeConnectSuccess | ChromeConnectError;

const connectToChrome = async (): Promise<ChromeConnect> => {
  let client: cri.Client;
  try {
    client = await CDP();
  }
  catch (e) {
    return { success: false, error: `${e}` };
  }

  const { Network, Page, Runtime } = client;
  await (Network as any).enable();
  await Page.enable();

  return { success: true, client };
};

interface JobInfo {
  "div": {
    "div": [
      {
        "h6": "Apply to"
      },
      {
        "div": [
          {
            "img": "",
            "h3": {
              "a": string
            }
          },
          {
            "div": {
              "button": "Show More"
            }
          },
          {
            "div": {
              "div": [
                {
                  "dt": "Location",
                  "dd": {
                    "div": {
                      "span": "San Francisco Bay Area • Remote"
                    }
                  }
                },
                {
                  "dt": "Job type",
                  "dd": "Full Time"
                },
                {
                  "dt": "Visa sponsorship",
                  "dd": {
                    "span": "Not Available"
                  }
                },
                {
                  "dt": "Hires remotely",
                  "dd": {
                    "div": {
                      "span": "Everywhere"
                    }
                  }
                },
                {
                  "dt": "Remote Work Policy",
                  "dd": "Remote Only"
                },
                {
                  "dt": "Experience",
                  "dd": "3+ years"
                },
                {
                  "dt": "Skills",
                  "dd": {
                    "a": [
                      "MongoDB",
                      "Node.js",
                      "Cassandra",
                      "TypeScript"
                    ]
                  }
                }
              ]
            }
          }
        ],
        "h4": string,
        "span": "$90k – $120k • 0.1% – 0.25%"
      }
    ]
  }
}

const getPosition = (jobInfo: JobInfo) => {
  return jobInfo.div.div[1].h4;
};

const getCompanyName = (jobInfo: JobInfo) => {
  return jobInfo.div.div[1].div[0].h3.a;
};

interface JobInfoParsed {
  company: string,
  position: string,
  hiringContact: string
}

const generateLetter = (letterTemplate: string, infoParsed: JobInfoParsed) => {
  const cfg: Record<string, string> = {
    "coder": infoParsed.position,
    "your company": infoParsed.company,
    "hiring manager": infoParsed.hiringContact
  };

  let contents = letterTemplate;

  for (const key in cfg) {
    for (; ;) {
      let res = contents.replace(key, cfg[key] as string);
      if (res === contents) {
        break;
      }
      else {
        contents = res;
      }
    }
  }

  return contents;
};

const getJobInfoParsed = async (chromeConnect: ChromeConnectSuccess) => {
  const result = await chromeConnect.client.Runtime.evaluate({
    expression: `document.getElementsByClassName("styles_jobInfo__FTdPp")[0].outerHTML` // TODO: Unhardcode. Looks unreliable
  });
  const evaluateResult = result.result.value;

  const res = (new xml.XMLParser()).parse(evaluateResult);

  const position = getPosition(res);
  const company = getCompanyName(res);

  const result1 = await chromeConnect.client.Runtime.evaluate({
    expression: `document.documentElement.innerHTML`
  });
  const evaluateResult1 = result1.result.value as string;

  let tmp = evaluateResult1.slice(
    23 + evaluateResult1.indexOf("Your hiring contact is"));
  tmp = tmp.slice(0, tmp.indexOf('<'));

  // No name so just calling this person "hiring manager"
  if (evaluateResult1.indexOf("Your hiring contact is") === -1) {
    tmp = "hiring manager";
  }
  return { position, company, hiringContact: tmp };
};

const sendApplication = async (infoFull: JobInfoParsed | undefined) => {
  const clickSend = await findAndClick("assets/angel-co-send-application.png");
  await nut.keyboard.pressKey(nut.Key.Escape);
  await nut.keyboard.releaseKey(nut.Key.Escape);

  // Failed click attempts do not increase counter

  if (infoFull && clickSend.success)
    applications.push(infoFull);

  if (clickSend.success)
    totalApplications++;

  console.log({ totalApplications });
  await nut.mouse.scrollDown(400);
  if (totalApplications == 30) {
    console.log("Done");
    process.exit(0);
  }
};

const main = async () => {
  if (`${nutTemplateMatcher}` === "this cond is never true") {
    console.log(nutTemplateMatcher);
  }

  let chromeConnect: ChromeConnect;
  let chromeTipSent = false;

  while (true) {
    // No event loop issues here, just prevent flood:
    await new Promise(r => setTimeout(r, 100));

    chromeConnect = await connectToChrome();
    if (chromeConnect.success) {
      chromeTipSent = false;
      console.log("Connected to Chrome. Thanks.");
      break;
    }
    else {
      if (!chromeTipSent) {
        if (chromeConnect.error?.indexOf("ECONNREFUSED") !== -1) {
          chromeTipSent = true;
          console.log("I wait for a debuggable Chrome instance. Try running 'chrome --remote-debugging-port=9222 --user-data-dir=temp https://angel.co/jobs'");
        }
        else {
          console.log(chromeConnect.error);
        }
      }
    }
  }

  let wasOnAngel = null;

  for (; ;) {
    // DO NOT REMOVE THIS LINE
    // It pervents event loop issue
    await new Promise(r => setTimeout(r, 100));

    const chromeStr = ["Startup Jobs | AngelList Talent - Google Chrome", "*Startup Jobs | AngelList Talent - Google Chrome"];
    const activeWindow = await nut.getActiveWindow();
    const isOnAngel = chromeStr.includes(await activeWindow.title);

    if (wasOnAngel !== isOnAngel) {
      wasOnAngel = isOnAngel;
      if (isOnAngel) {
        console.log("I see angel.co :)");
      }
      else {
        console.log("Please focus angel.co for me :(");
      }
    }

    if (isOnAngel) {
      await findAndClick("assets/angel-co-skip-ass.png");

      const res1 = await findAndClick("assets/angel-co-apply.png");
      if (res1.success) {
        console.log("Waiting 500ms for application view load");
        await new Promise(r => setTimeout(r, 500));
      }

      const res = await findAndClick("assets/angel-co-write-a-note.png");

      if (!res.success) {
        //await sendApplication(undefined);
        console.log("Scrolling down");
        await nut.mouse.scrollDown(300);
      }
      if (res.success) {

        const infoFull = await getJobInfoParsed(chromeConnect);

        console.log(infoFull);

        let newPosition = "";
        let newHiringContact = "";

        const html = (await chromeConnect.client.Runtime.evaluate({
          expression: `document.documentElement.innerHTML`
        })).result.value as string;

        if (infoFull.position.toLowerCase().includes("ethereum")
          || infoFull.position.toLowerCase().includes("contract")
          || infoFull.position.toLowerCase().includes("relations")
          || infoFull.position.toLowerCase().includes("solidity")
          || infoFull.position.toLowerCase().includes("security")
          || infoFull.position.toLowerCase().includes("anal")
          || infoFull.position.toLowerCase().includes("support")
          || infoFull.position.toLowerCase().includes("ai")
          || infoFull.position.toLowerCase().includes("devops")
          || infoFull.position.toLowerCase().includes("php")
          || infoFull.position.toLowerCase().includes("junior")
          || infoFull.position.toLowerCase().includes("rust")
          || infoFull.position.includes("Only")) {
          console.log("Skipping " + infoFull.position);
          await nut.keyboard.pressKey(nut.Key.Escape);
          await nut.keyboard.releaseKey(nut.Key.Escape);
          await nut.mouse.scrollDown(500);
        }
        else if (applications.find(x => x.company === infoFull.company)) {
          console.log("Skipping company (Already applied!)");
          await nut.keyboard.pressKey(nut.Key.Escape);
          await nut.keyboard.releaseKey(nut.Key.Escape);
          await nut.mouse.scrollDown(500);
        }
        else if (html.indexOf("This job does not support the locations or timezones for remote work on your profile.") !== -1) {
          console.log("Skipping company (Bad timezone!)");
          await nut.keyboard.pressKey(nut.Key.Escape);
          await nut.keyboard.releaseKey(nut.Key.Escape);
          await nut.mouse.scrollDown(500);
        }
        else if (html.indexOf("does not offer visa sponsorship and requires all remote workers to be in-country.") !== -1) {
          console.log("Skipping company (Does not offer visa sponsorship!)");
          await nut.keyboard.pressKey(nut.Key.Escape);
          await nut.keyboard.releaseKey(nut.Key.Escape);
          await nut.mouse.scrollDown(500);
        }
        else if (html.indexOf("is not accepting applications from your current location due to timezone or relocation constraints") !== -1) {
          console.log("Skipping company (Hates my timezone!)");
          await nut.keyboard.pressKey(nut.Key.Escape);
          await nut.keyboard.releaseKey(nut.Key.Escape);
          await nut.mouse.scrollDown(500);
        }
        else if (html.indexOf("Improve your odds") !== -1) {
          console.log("Skipping company (Asked to improve odds!)");
          await nut.keyboard.pressKey(nut.Key.Escape);
          await nut.keyboard.releaseKey(nut.Key.Escape);
          await nut.mouse.scrollDown(500);
        }
        else {
          newPosition = "Software Engineer";
          if (infoFull.position.toLowerCase().includes("full") && infoFull.position.toLowerCase().includes("stack")) {
            newPosition = "Full-Stack Developer";
          }
          else if (infoFull.position.toLowerCase().includes("back")) {
            newPosition = "Backend Developer";
          }
          else if (infoFull.position.toLowerCase().includes("front")) {
            newPosition = "Frontend Developer";
          }
          else if (infoFull.position.toLowerCase().includes("product")) {
            newPosition = "Product Engineer";
          }

          if (infoFull.position.toLowerCase().includes("senior")) {
            newPosition = "Senior " + newPosition;
          }
        }

        newHiringContact = infoFull.hiringContact;
        // `Andrew O` => `Andrew` (real case)
        if (`${infoFull.hiringContact.split(' ')[1]}`.length === 1) {
          newHiringContact = '' + infoFull.hiringContact.split(' ')[0];
        }

        // if skipped
        if (!newPosition) {
          await nut.keyboard.pressKey(nut.Key.Escape);
          await nut.keyboard.releaseKey(nut.Key.Escape);
          await nut.mouse.scrollDown(500);
        }

        // if not skipped
        if (newPosition) {

          infoFull.position = newPosition;
          infoFull.hiringContact = newHiringContact;

          console.log({ newPosition, newHiringContact });


          console.log("Copy-pasting cover letter");
          const letterTemplate = fs.readFileSync("./Cover letter.md", "utf-8");
          const letter = generateLetter(letterTemplate, infoFull);
          console.log(letter);
          await nut.clipboard.copy(letter);
          await nut.keyboard.pressKey(nut.Key.LeftControl, nut.Key.V);
          await nut.keyboard.releaseKey(nut.Key.LeftControl, nut.Key.V);

          console.log("Waiting 500ms for no reason");
          await new Promise(r => setTimeout(r, 500));

          // Maybe we already wrote the letter and want to submit
          await sendApplication(infoFull);
        }
      }
    }
  }
}

main();