"use client";

import { useForm } from "react-hook-form";
import { FORM_STATE, MyDatePicker, useFormSubmit, useYupValidationResolver } from "/lib/form";
import * as yup from "yup";

const Page = () => {
    const validationSchema = yup.object({
<% 
        attributes.forEach((attribute, index) => { 
            if (!attribute.attributes) {  
                const isNumber = attribute.type === "biginteger" 
                    || attribute.type === "integer" || attribute.type === "decimal"
                    || attribute.type === "float";
%>        <%- attribute.name %>: yup.<%- isNumber?"number()":(attribute.type === "boolean"?"boolean()":"string()") 
    %><%- attribute.required?".required()":""
    %><%- attribute.type === "email" ? ".email()" : ""
    %><%- attribute.maxLength ? ".max("+attribute.maxLength+")" : ""
    %><%- attribute.minLength ? ".min("+attribute.minLength+")" : ""
%>,
<%
            }
        })
%>    });

    const resolver = useYupValidationResolver(validationSchema);

    const { register, handleSubmit, control, watch, formState: { errors } } = useForm({ resolver });
    const [onSubmit, formState] = useFormSubmit(process.env.NEXT_PUBLIC_BASE_PATH + "/<%- baseDir %>/api");
    return (
        <>
            {formState === FORM_STATE.SUBMITTED &&
                <div className="alert alert-success" role="alert">
                    Form submitted successfully
                </div>
            }
            {formState !== FORM_STATE.SUBMITTED &&
                <form onSubmit={handleSubmit(onSubmit)} style={
                    {
                        pointerEvents: formState === FORM_STATE.SUBMITTING ? "none" : "initial",
                        opacity: formState === FORM_STATE.SUBMITTING ? 0.5 : 1,
                    }}>
<% 
        console.log("attributes", attributes);
        attributes.forEach((attribute, index) => { 
            const name = attribute.name;
%>
                    <div className="<%- attribute.type === "boolean"?"form-check":"form-group"%> mb-3">
                        <label htmlFor="<%-name%>" className="form<%- attribute.type === "boolean"?"-check":""%>-label"><%-name%></label><% 
                        switch (attribute.type) {
                            case "boolean":
%>
                        <input type="checkbox" className="form-check-input" id="<%-name%>" placeholder="<%-name%>" {...register("<%-name%>")} /><%
                                break;
                            case "date":
%>  
                        <MyDatePicker control={control} name="<%-name%>" /><%
                                break;
                            case "text":
%>
                        <textarea type="text" className="form-control" id="<%-name%>" placeholder="<%-name%>" {...register("<%-name%>")} /><%
                                break;
                            case "enumeration":
%>
                        <select className="form-control" id="<%-name%>" {...register("<%-name%>")}>
                            <option value="">Select</option><%
                             attribute.enum.map((value) => { %>
                            <option value="<%- value %>"><%- value %></option><%
                             }) %>
                        </select><%
                                break;

                            default:
%>
                        <input type="text" className="form-control" id="<%-name%>" placeholder="<%-name%>" {...register("<%-name%>")} /><%
                                break;
                        }       
%>
                        {errors.<%-name%> && <div className="invalid-feedback" style={{ display: "initial" }}>{errors.<%-name%>.message}</div>}                        
                    </div>
<% }) %>                    

                    <button type="submit" className="btn btn-primary">Submit</button>
                </form>
            }
        </>
    );
}

export default Page;