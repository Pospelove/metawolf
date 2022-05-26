import * as nut from "@nut-tree/nut-js";
import * as nutTemplateMatcher from "@nut-tree/template-matcher";
import * as fs from "fs";

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
  return res;
}

const main = async () => {
  console.log(nutTemplateMatcher);
  /*const windows = await nut.getWindows();
  const titlePromises = windows.map(win => win.title);
  const titles = await Promise.all(titlePromises);
  console.log(titles.filter(x => x.indexOf("Startup Jobs | AngelList Talent - Google Chrome") !== -1));*/


  for (; ;) {
    const chromeStr = "Startup Jobs | AngelList Talent - Google Chrome";
    const activeWindow = await nut.getActiveWindow();
    const isOnAngel = await activeWindow.title === chromeStr;

    if (!isOnAngel) {
      console.log("Go to angel.co and activate window plz");
      await new Promise(r => setTimeout(r, 100));
    }
    else {
      // 1. найти кнопку Apply и кликнуть
      // 2. написать в консоль

      //console.log("I wanna apply");
      const res = await findAndClick("assets/angel-co-apply.png");
      if (res.success) {
        //console.log("Clicked apply");
      }
      else {
        //console.log("Failed. No such button here");
      }

      if (!res.success) {
        const res = await findAndClick("assets/angel-co-write-a-note.png");
        nut.keyboard.type(fs.readFileSync("./Cover letter.md", "utf-8"));
      }
    }
  }
}

main();