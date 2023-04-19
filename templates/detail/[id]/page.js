import { fetchAPI } from "/lib/api";

<%
function putFields(name, attributes) {
%>
	<div>
		<% attributes.forEach((attribute, index) => { 
			if (!attribute.attributes) { %>
				<div>{<%- name %>.<%- attribute.name %>}</div>
			<% } else { 
				const isSingle = (attribute.type === "component" && !attribute.repeatable) || (attribute.type === "relation" && attribute.relation.endsWith("One"));
				if (!isSingle) {
			%>
				{<%- name %>.<%- attribute.name %>.map(sub => (
					<% putFields("sub", attribute.attributes); %>
				))}
				<% } else { %>
					<% putFields(name + "." + attribute.name, attribute.attributes); %>
				<% } %>
			<% } %>
		<% }) %>
	</div>
<%	
}
%>

const <%- componentName %> = async ({ params }) => {
    const item = (await fetchAPI("/<%- modelName %>", { "filters[<%- slug %>][$eq]": params.id,  populate: <%- JSON.stringify(populateArray) %>})).data[0];
    return (
		<div>
			<% attributes.forEach((attribute, index) => { 
				if (!attribute.attributes) { %>
					<div>{item.attributes.<%- attribute.name %>}</div>
				<% } else { 
					const isSingle = (attribute.type === "component" && !attribute.repeatable) || (attribute.type === "relation" && attribute.relation.endsWith("One"));
					if (!isSingle) {
					%>
					<div>
					{item.attributes.<%- attribute.name %>.map(sub => (
							<% putFields("sub", attribute.attributes); %>
					))}
					</div>
					<% } else { %>
					<div>
						<% putFields("item.attributes." + attribute.name, attribute.attributes); %>
					</div>
					<% } %>
				<% } %>
			<% }) %>
		</div>	
    );
}

export default <%- componentName %>;
