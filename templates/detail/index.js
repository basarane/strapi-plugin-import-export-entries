<%
makeComponents([], attributes, myCamel(model.info.singularName)); 

output.cssTree = cssTree;

%>
const <%- componentName %> = async ({ params }) => {
    <% if (model.kind === "singleType") {
		%>const item = (await fetchAPI("/<%- model.info.singularName %>", { populate: <%- JSON.stringify(populateArray) %>})).data;
		<% } else { 
		%>const item = (await fetchAPI("/<%- model.info.pluralName %>", { "filters[<%- slug %>][$eq]": params.id,  populate: <%- JSON.stringify(populateArray) %>})).data[0];
	<% } %>
    return (<% putFields([], "item.attributes", attributes, false, myCamel(model.info.singularName)); %>
	);
}

export default <%- componentName %>;
