import * as nut from "@nut-tree/nut-js";
import * as nutTemplateMatcher from "@nut-tree/template-matcher";
import * as fs from "fs";
import CDP from "chrome-remote-interface";
import * as cri from "chrome-remote-interface";
import * as xml from "fast-xml-parser";

const findAndClick = async (image: string) => {
  const res = { success: false };
  try {
    await nut.mouse.move(
      nut.straightTo(
        nut.centerOf(
          nut.screen.find(
            nut.imageResource(image)
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
      // 1. найти кнопку Apply и кликнуть
      // 2. написать в консоль

      const res1 = await findAndClick("assets/angel-co-apply.png");
      if (res1.success) {
        console.log("Waiting 500ms for application view load");
        await new Promise(r => setTimeout(r, 500));
      }

      const res = await findAndClick("assets/angel-co-write-a-note.png");

      if (!res.success) {
        console.log("Scrolling down");
        await nut.mouse.scrollDown(300);
      }
      if (res.success) {

        const result = await chromeConnect.client.Runtime.evaluate({
          expression: `document.getElementsByClassName("styles_jobInfo__FTdPp")[0].outerHTML` // TODO: Unhardcode class name. Looks unreliable
        });
        const evaluateResult = result.result.value;

        const parser = new xml.XMLParser();

        const res = parser.parse(evaluateResult);
        // console.log(JSON.stringify(res, null, 2));

        console.log(getPosition(res));
        console.log(getCompanyName(res));

        /*console.log("Copy-pasting cover letter");
        const letterTemplate = fs.readFileSync("./Cover letter.md", "utf-8");
        await nut.clipboard.copy(letterTemplate);
        await nut.keyboard.pressKey(nut.Key.LeftControl, nut.Key.V);
        await nut.keyboard.releaseKey(nut.Key.LeftControl, nut.Key.V);*/
      }
    }
  }
}

main();

// hiring manager
// coder
// your company