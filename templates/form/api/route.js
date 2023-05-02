import { STRAPI_POST } from "/lib/form-server";

export async function POST(request) {
    return STRAPI_POST("/<%- model.info.pluralName %>", request);
}
