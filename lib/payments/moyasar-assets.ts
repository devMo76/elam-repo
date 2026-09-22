export const MOYASAR_CSS_URL = "https://cdn.moyasar.com/mpf/1.15.0/moyasar.css";
export const MOYASAR_SCRIPT_URL = "https://cdn.moyasar.com/mpf/1.15.0/moyasar.js";

export class MoyasarAssetError extends Error {
  constructor(public readonly kind: "script" | "stylesheet" | "configuration") {
    super(`Moyasar ${kind} could not be loaded`);
    this.name = "MoyasarAssetError";
  }
}

type MoyasarAssetEnvironment = {
  documentObject: Document;
  isGatewayReady: () => boolean;
};

function waitForAsset(
  element: HTMLScriptElement | HTMLLinkElement,
  kind: "script" | "stylesheet",
) {
  return new Promise<void>((resolve, reject) => {
    const onLoad = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new MoyasarAssetError(kind));
    };
    const cleanup = () => {
      element.removeEventListener("load", onLoad);
      element.removeEventListener("error", onError);
    };

    element.addEventListener("load", onLoad, { once: true });
    element.addEventListener("error", onError, { once: true });
  });
}

export function createMoyasarAssetLoader(getEnvironment: () => MoyasarAssetEnvironment) {
  let activeLoad: Promise<void> | null = null;

  return function loadMoyasarAssets() {
    const environment = getEnvironment();
    if (environment.isGatewayReady()) return Promise.resolve();
    if (activeLoad) return activeLoad;

    const { documentObject } = environment;
    let stylesheet = documentObject.querySelector<HTMLLinkElement>(
      `link[href="${MOYASAR_CSS_URL}"]`,
    );
    let script = documentObject.querySelector<HTMLScriptElement>(
      `script[src="${MOYASAR_SCRIPT_URL}"]`,
    );
    const createdStylesheet = !stylesheet;
    const createdScript = !script;

    if (!stylesheet) {
      stylesheet = documentObject.createElement("link");
      stylesheet.href = MOYASAR_CSS_URL;
      stylesheet.rel = "stylesheet";
    }

    if (!script) {
      script = documentObject.createElement("script");
      script.src = MOYASAR_SCRIPT_URL;
      script.async = true;
    }

    const stylesheetReady = createdStylesheet
      ? waitForAsset(stylesheet, "stylesheet")
      : Promise.resolve();
    const scriptReady = waitForAsset(script, "script");

    if (createdStylesheet) documentObject.head.appendChild(stylesheet);
    if (createdScript) documentObject.head.appendChild(script);

    activeLoad = Promise.all([stylesheetReady, scriptReady])
      .then(() => {
        if (!environment.isGatewayReady()) {
          throw new MoyasarAssetError("configuration");
        }
      })
      .catch((error: unknown) => {
        if (createdScript) script.remove();
        if (createdStylesheet) stylesheet.remove();
        activeLoad = null;
        throw error;
      });

    return activeLoad;
  };
}

export const loadMoyasarAssets = createMoyasarAssetLoader(() => ({
  documentObject: document,
  isGatewayReady: () => Boolean(window.Moyasar),
}));
