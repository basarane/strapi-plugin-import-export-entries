<%
makeComponents([], attributes, myCamel(model.info.singularName)); 

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
