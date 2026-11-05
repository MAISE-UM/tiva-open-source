import React from "react";
import {Section} from "@/app/admin/api-edit/sub-components/General";
import { Button } from "@/components/ui/button";

export default function APIReviewSaved() {
    return (
        <Section>
            <h1 style={{textAlign: 'center'}}>API Changes Successfully Saved</h1>
            <Button style={{margin: '0 auto'}} onClick={() => window.location.reload()}>
                Reload Page
            </Button>
        </Section>
    );
}