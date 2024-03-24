<%- noFetch?"\"use client\";":"" %>
import { fetchAPI } from "@/lib/api";
import { fixStrapiHtml } from "@/lib/media";
import Image from "@/components/image";
<% if (css === "module") { 
%>import styles from "@/styles/<%- cssFileName %>";
<% } else if (css === "global") { 
%>import "@/styles/<%- cssFileName %>";	
<% }

makeComponents([], attributes, myCamel(model.info.singularName)); 

output.cssTree = cssTree;

%>
const <%- componentName %> = <%- !noFetch?"async ":"" %>({ <%- noFetch?"item":"params" %> }) => {
    <% if (!noFetch) {
	if (model.kind === "singleType") {
		%>const item = (await fetchAPI("/<%- model.info.singularName %>", { populate: <%- JSON.stringify(populateArray) %>})).data;
		<% } else { 
		%>const item = (await fetchAPI("/<%- model.info.pluralName %>", { "filters[<%- slug %>][$eq]": params.id, populate: <%- JSON.stringify(populateArray) %>})).data[0];
	<% } 
	}
	%>
    return (<% putFields([], "item.attributes", attributes, false, myCamel(model.info.singularName)); %>
	);
}

export default <%- componentName %>;
