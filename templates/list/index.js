<%
makeComponents([], attributes, myCamel(model.info.singularName)); 

console.log(JSON.stringify(cssTree, null, 3));
output.cssTree = cssTree;

%>
const <%- componentName %> = async ({ }) => {
    const items = (await fetchAPI("/<%- model.info.pluralName %>", { populate: <%- JSON.stringify(populateArray) %>})).data;

    return (
        <div className="Container">
            {items.map(item => (
<% putFields([], "item.attributes", attributes, true, myCamel(model.info.singularName)); %>
    ))}
    </div>
    );
}

export default <%- componentName %>;
