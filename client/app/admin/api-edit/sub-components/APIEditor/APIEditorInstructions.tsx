import React from "react";
import {Section} from "@/app/admin/api-edit/sub-components/General";

export default function APIEditorInstructions() {
    return (
        <Section>
            <div style={{width: '60%', textAlign: 'center', margin: '0 auto'}}>
                <h2>Instructions</h2>
                <p style={{textAlign: "left"}}>
                    Edit the API by expanding a given controller and either modifying a given endpoint
                    inside the controller o adding a new one. An object with a orange border implies
                    that it has been changed, red implies that it has been changed in an incorrect way.
                    When done editing click the Review button to review changes.
                </p>
            </div>
        </Section>
    )
}