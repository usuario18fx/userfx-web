let corePromise;

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    corePromise ||= import("./telegram-core.js");
    const core = await corePromise;
    return core.default(req, res);
}
