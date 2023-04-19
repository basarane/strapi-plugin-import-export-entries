import { fetchAPI } from "/lib/api";

const <%- componentName %> = async ({ }) => {
    const items = (await fetchAPI("/<%- modelName %>", { populate: <%- JSON.stringify(populateArray) %>})).data;
    return (
        <div>
            {items.map(p => (
                <div key={p.id}>
                    <% attributeNames.forEach((attribute, index) => { %>
                        <div>{p.attributes.<%- attribute %>}</div>
                    <% }) %>
                </div>
            ))}
        </div>
    );
}

export default <%- componentName %>;
