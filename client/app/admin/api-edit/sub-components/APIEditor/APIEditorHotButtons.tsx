import React from "react";
import {Section} from "@/app/admin/api-edit/sub-components/General";
import {Button} from "@/components/ui/button";

interface APIEditorHotButtonsProps {
    triggerAPIReload: () => void;
}

export default function APIEditorHotButtons({
    triggerAPIReload
}: APIEditorHotButtonsProps) {

    return (
        <Section>
            <div style={{width: '60%', textAlign: 'center', margin: '0 auto'}}>
                <h2>Hot Buttons</h2>
                <div style={{display: 'flex', justifyContent: 'center'}}>
                    <Button className={'btn btn-primary'} onClick={triggerAPIReload}>Reload API From DB</Button>
                    <Button style={{marginLeft : '1rem'}} onClick={() => window.location.reload()} className={'btn btn-primary'}>Reload Page From DB</Button>
                </div>
            </div>
        </Section>
    )
}