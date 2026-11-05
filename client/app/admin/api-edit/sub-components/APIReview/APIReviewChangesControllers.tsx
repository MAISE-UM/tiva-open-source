import React from "react";
import {ApiEndpoint} from "@/app/admin/api-edit/sub-components/api-interfaces";
import {Section} from "@/app/admin/api-edit/sub-components/General";

interface APIReviewChangesControllersProps {
    controllersToAdd: Set<string>;
    controllersToModify: { [key: string]: {[key: number]: ApiEndpoint }};
    controllersToDelete: Set<string>;
}

export default function APIReviewChangesControllers({
    controllersToAdd,
    controllersToModify,
    controllersToDelete
}: APIReviewChangesControllersProps) {
    return (
        <>
            {
                controllersToAdd.size !== 0 &&
                <Section>
                    <div style={{width: '60%', textAlign: 'center', margin: '0 auto'}}>
                        <h2>New Controllers</h2>
                        {[...controllersToAdd].map((controller) => <p key={controller}>{controller}</p>)}
                    </div>
                </Section>
            }
            {
                Object.keys(controllersToModify).filter((controller) => !controllersToDelete.has(controller)).length > 0 &&
                <Section>
                    <div style={{width: '60%', textAlign: 'center', margin: '0 auto'}}>
                        <h2>Modified Controllers</h2>
                        {Object.keys(controllersToModify).filter((controller) => !controllersToDelete.has(controller)).map((controller) => controllersToAdd.has(controller) ?
                            <div key={controller} /> : <p key={controller}>{controller}</p>)}
                    </div>
                </Section>
            }
            {
                controllersToDelete.size > 0 &&
                <Section>
                    <div style={{width: '60%', textAlign: 'center', margin: '0 auto'}}>
                        <h2>Deleted Controllers</h2>
                        {[...controllersToDelete].map((controller) => <p key={controller}>{controller}</p>)}
                    </div>
                </Section>
            }
        </>
    )
}