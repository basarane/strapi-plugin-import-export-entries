<%
const cssTree = [];
function addToCss(path) {
	let current = cssTree;
	for (const part of path) {
		let found = current.find(p => p.name === part);
		if (!found) {
			found = { name: part, children: [] };
			current.push(found);
		}
		current = found.children;
	}
 }

function myCamel(str) {
	const camelCased = str.replace(/[\|]/g, "-").replace(/[\_\.-]([a-z])/g, function (g) { return g[1].toUpperCase(); }).replace(/[\.]/g, "_");
	const capitalized = camelCased.charAt(0).toUpperCase() + camelCased.slice(1);
	return capitalized;
}

function makeComponent(componentPath, suffix, attributes, rootCss) {
%>
const <%- componentPath.join("_") %> = async ({ item }) => {
	return (<% putFields(componentPath, "item" + suffix, attributes, false, rootCss); %>
	);
}
<%	
}

function makeComponents(path, attributes, rootCss) {
	attributes.forEach((attribute, index) => {
		if (attribute.attributes && attribute.target != "plugin::upload.file") {
			const componentPath = [...path];
			componentPath.push(myCamel(attribute.name));
			const suffix = attribute.type === "relation"?".attributes":"";
			if (attribute.attributes[0] && attribute.attributes[0].modelType === "component") {
				attribute.attributes.forEach((comp, index) => {
					makeComponents([...componentPath, myCamel(comp.name)], comp.attributes, rootCss);
					makeComponent([...componentPath, myCamel(comp.name)], suffix, comp.attributes, rootCss);
				});
			} else {
				makeComponents(componentPath, attribute.attributes, rootCss);
				makeComponent(componentPath, suffix, attribute.attributes, rootCss);
			}
		} 		
	});
	// makeComponent(path, "", attributes, rootCss);
}

function putCss(className) {
	if (css === "module") {
		%> className={styles.<%-className%>}<%
	} else if (css === "global") {
		%> className="<%-className%>"<%
	}
}

function putFields(path, name, attributes, disableCheck, cssName) {
	let prefix = path.join("_");
	if (prefix.length > 0) {
		prefix += "_";
	}
    if (!disableCheck) {
%><>{<%- name.replace(/.attributes$/,"") %> && <% } 
%>
		<div<%putCss(path.length===0?cssName:path[path.length-1]) %>><% 
	attributes.forEach((attribute, index) => { 
		if (!attribute.attributes && attribute.target != "plugin::upload.file") {  
			addToCss([cssName, ...path, attribute.name])
			if (attribute.type === "richtext") { %>
			<div<%putCss(attribute.name) %> dangerouslySetInnerHTML={{ __html: fixStrapiHtml(<%- name %>.<%- attribute.name %>) }}></div><% 
			} else { %>
			<div<%putCss(attribute.name) %>>{<%- name %>.<%- attribute.name %>}</div><% 
			}
		} else { 
			const isFile = attribute.target === "plugin::upload.file";
			const isSingle = (attribute.type === "component" && !attribute.repeatable) || (attribute.type === "relation" && attribute.relation.endsWith("One"));
			const suffix = attribute.type === "relation"?".data":"";
			const isDynamicZone = attribute.type === "dynamiczone";
			console.log(attribute.name, isFile, isSingle, isDynamicZone);
			if (isFile) { 
				addToCss([cssName, ...path, attribute.name])
				if (!isSingle) { %>
			<div<%putCss(attribute.name+"s") %>>
				{<%- name %>.<%- attribute.name %><%- suffix %>.map(sub => (
					<div<%putCss(attribute.name) %>><Image image={{data: sub}} /></div>
				))}
			</div><%
				} else { %>
			<div<%putCss(attribute.name) %>><Image image={<%- name %>.<%- attribute.name %>} /></div><%
				}
			} else if (isDynamicZone) {
				addToCss([cssName, ...path, attribute.name+"s"])%>
			<div<%putCss(attribute.name+"s") %>>
				{<%- name %>.<%- attribute.name %><%- suffix %>.map(sub => (
					<>
<%attribute.components.forEach((comp, index) => {
%>						{sub.__component === "<%- comp %>" && <<%- prefix+myCamel(attribute.name) %>_<%- prefix+myCamel(comp) %> key={sub.id} item={sub} />}
<%
						});
%>					</>
				))}
			</div>
				<%
			} else if (!isSingle) {
				addToCss([cssName, ...path, attribute.name+"s"])%>
			<div<%putCss(attribute.name+"s") %>>
				{<%- name %>.<%- attribute.name %><%- suffix %>.map(sub => (
					<<%- prefix+myCamel(attribute.name) %> key={sub.id} item={sub} />
				))}
			</div><% 
			} else { %>
			<<%- prefix+myCamel(attribute.name) %> item={<%- name %>.<%- attribute.name %><%- suffix %>} /><% 		} 
		} 
	}) %>
		</div><% if (!disableCheck) { %>
	}</><%	
    }
}


%>