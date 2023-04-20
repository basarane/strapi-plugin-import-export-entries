import { fetchAPI } from "/lib/api";
<%

function myCamel(str) {
	const camelCased = str.replace(/\_([a-z])/g, function (g) { return g[1].toUpperCase(); });
	const capitalized = camelCased.charAt(0).toUpperCase() + camelCased.slice(1);
	return capitalized;
}

function makeComponents(prefix, attributes) {
	attributes.forEach((attribute, index) => {
		if (attribute.attributes) {
			const componentName = prefix + myCamel(attribute.name);
			const suffix = attribute.type === "relation"?".attributes":"";
			makeComponents(componentName+"_", attribute.attributes);
%>
const <%- componentName %> = async ({ item }) => {
    return (<% putFields(componentName, "item" + suffix, attribute.attributes); %>
	);
}
<%
		} 		
	});
}

function putFields(prefix, name, attributes) {
	if (prefix) prefix += "_";
%><>{<%- name.replace(/.attributes$/,"") %> && 
		<div><% 
	attributes.forEach((attribute, index) => { 
		if (!attribute.attributes) { %>
			<div>{<%- name %>.<%- attribute.name %>}</div><% 
		} else { 
			const isSingle = (attribute.type === "component" && !attribute.repeatable) || (attribute.type === "relation" && attribute.relation.endsWith("One"));
			const suffix = attribute.type === "relation"?".data":"";
			if (!isSingle) {%>
			<div>
				{<%- name %>.<%- attribute.name %><%- suffix %>.map(sub => (
					<<%- prefix+myCamel(attribute.name) %> item={sub} />
				))}
			</div><% 
			} else { %>
			<<%- prefix+myCamel(attribute.name) %> item={<%- name %>.<%- attribute.name %><%- suffix %>} /><% 		} 
		} 
	}) %>
		</div>
	}</><%	
}

makeComponents("", attributes); 

%>

const <%- componentName %> = async ({ params }) => {
    const item = (await fetchAPI("/<%- modelName %>", { "filters[<%- slug %>][$eq]": params.id,  populate: <%- JSON.stringify(populateArray) %>})).data[0];
    return (<% putFields("", "item.attributes", attributes); %>
	);
}

export default <%- componentName %>;
