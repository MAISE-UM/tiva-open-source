import React, {useState} from "react";
import {ApiEndpoint} from "@/app/admin/api-edit/sub-components/api-interfaces";
import APIReviewChanges from "@/app/admin/api-edit/sub-components/APIReview/APIReviewChanges";
import APIReviewSaved from "@/app/admin/api-edit/sub-components/APIReview/APIReviewSaved";

interface APIEditorProps {
    controllersToModify: { [key: string]: {[key: number]: ApiEndpoint }};
    controllersToAdd: Set<string>;
    controllersToDelete: Set<string>;
    controllersOriginalCache: { [key: string]: {[key: number]: ApiEndpoint }};
    controllerEndpointMapping: { [key: string]: {[key: number]: ApiEndpoint }};
    triggerAPIEdit: () => void;
    triggerAPIReload: () => void;
}

export default function APIEditor({
    controllersToModify,
    controllersToAdd,
    controllersToDelete,
    controllersOriginalCache,
    controllerEndpointMapping,
    triggerAPIEdit,
    triggerAPIReload
}: APIEditorProps) {
    const [view, setView] = useState<string>('review');

    return (
        <>
            {view === 'review' &&
                <APIReviewChanges
                    controllersToModify={controllersToModify}
                    controllersToAdd={controllersToAdd}
                    controllersToDelete={controllersToDelete}
                    controllersOriginalCache={controllersOriginalCache}
                    controllerEndpointMapping={controllerEndpointMapping}
                    triggerAPIEdit={triggerAPIEdit}
                    triggerAPIReload={triggerAPIReload}
                    setView={setView}
                />
            }
            {
                view === 'saved' &&
                <APIReviewSaved />
            }
        </>
    );
}