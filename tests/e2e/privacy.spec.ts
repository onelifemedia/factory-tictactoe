// F-012 R-012 R-013: a full game (the 3b draw) makes requests only to the
// page's own origin, requests no font files, and leaves no cookies and empty
// localStorage and sessionStorage. Requests are recorded from before the
// first navigation. F-014 R-013: it requests no image file either, of any
// origin; the whole look is CSS and same-document inline SVG.
import { test, expect, type Request } from "@playwright/test";
import { chooseFirstMover, locateStatus, playMoves } from "./game-page";
import { DRAW_MOVES } from "./game-states";

const FONT_FILE_PATTERN = /\.(woff2?|ttf|otf|eot)$/i;
const IMAGE_FILE_PATTERN = /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|tiff?)$/i;

interface StorageContents {
  cookie: string;
  localStorageLength: number;
  sessionStorageLength: number;
}

test.describe("privacy during a full game (F-012)", () => {
  test("a full game requests only same-origin resources, no font or image file, and leaves no cookies or storage (F-012 R-012 R-013, F-014 R-013)", async ({
    page,
    context,
  }, testInfo) => {
    const requests: Request[] = [];
    page.on("request", (request) => {
      requests.push(request);
    });

    await page.goto("/");
    await chooseFirstMover(page, testInfo, "You go first");
    await playMoves(page, testInfo, DRAW_MOVES);
    await expect(locateStatus(page)).toHaveText("It's a draw.");

    const pageOrigin = new URL(page.url()).origin;
    const requestUrls = requests.map((request) => request.url());
    expect(requestUrls.length).toBeGreaterThan(0);

    const foreignOriginUrls = requestUrls.filter(
      (requestUrl) => new URL(requestUrl).origin !== pageOrigin,
    );
    expect(foreignOriginUrls).toEqual([]);

    const fontRequestUrls = requests
      .filter(
        (request) =>
          request.resourceType() === "font" ||
          FONT_FILE_PATTERN.test(new URL(request.url()).pathname),
      )
      .map((request) => request.url());
    expect(fontRequestUrls).toEqual([]);

    const imageRequestUrls = requests
      .filter(
        (request) =>
          request.resourceType() === "image" ||
          IMAGE_FILE_PATTERN.test(new URL(request.url()).pathname),
      )
      .map((request) => request.url());
    expect(imageRequestUrls, "image requests (F-014 R-013)").toEqual([]);

    const storageContents = await page.evaluate((): StorageContents => ({
      cookie: document.cookie,
      localStorageLength: localStorage.length,
      sessionStorageLength: sessionStorage.length,
    }));
    expect(storageContents).toEqual({
      cookie: "",
      localStorageLength: 0,
      sessionStorageLength: 0,
    });
    expect(await context.cookies()).toEqual([]);
  });
});
