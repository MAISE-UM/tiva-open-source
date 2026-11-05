'use client'
import React, { useEffect, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { VerifyRecaptcha } from '@/api/auth-api';
import {getRedirectPath, setCaptchaCookie, setDisclaimerCookie, setRedirectPath} from "@/lib/cookies";
import {redirect} from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {DISCLAIMER_TEXT} from "@/lib/disclaimer";

const RECAPTCHA_SITE_KEY = (String) (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY); // Replace with your site key
console.log('RECAPTCHA_SITE_KEY', RECAPTCHA_SITE_KEY)

// Hosts (host[:port]) where the captcha is skipped, comma separated in NEXT_PUBLIC_CAPTCHA_DISABLED_HOSTS
export const CaptchaDisabledList = (process.env.NEXT_PUBLIC_CAPTCHA_DISABLED_HOSTS ?? '')
    .split(',')
    .map(host => host.trim())
    .filter(host => host !== '');

interface DisclaimerCaptchaComponent {
    // modalOpen: boolean, 
    // setModalOpen: React.Dispatch<React.SetStateAction<boolean>>
    className?: string | null
}

const DisclaimerCaptcha: React.FC<DisclaimerCaptchaComponent> = () => {
    const [captchaValue, setCaptchaValue] = useState<string|null>(null);
    const [userIP, setUserIP] = useState<string>("");
    const [userLocation, setUserLocation] = useState<{city: string, region: string, country: string}|null>(null);

    useEffect(() => {
        // Fetch the user's public IP address and location
        const fetchUserIPAndLocation = async () => {
            try {
                // Fetching IP and location using ipapi.co
                const response = await fetch('https://ipapi.co/json');
                const data = await response.json();
                
                setUserIP(data.ip);
                setUserLocation({
                    city: data.city,
                    region: data.region,
                    country: data.country_name,
                });

            } catch (error) {
                console.error('Error fetching IP and location:', error);
            }
        };

        fetchUserIPAndLocation();
    }, []);

    const toggleModal = () => {
        // setModalOpen(!modalOpen);
        setTimeout(async () => {
            await setDisclaimerCookie("agree", 12);
            const redirectUrl = await getRedirectPath();
            console.log('redirectPath', redirectUrl)
            if(redirectUrl != null) {
                console.log('redirecting to', redirectUrl)
                await setRedirectPath(null);
                redirect(redirectUrl)
            } else {
                redirect('/')
            }

        }, 500);
    };

    const handleCaptchaChange = async  (token: string|null) => {
        if(token == null) {
            return;
        }
        setCaptchaValue(token);
        // alert('CAPTCHA completed successfully');
        await setCaptchaCookie(token, 12);
        return VerifyRecaptcha({
            key: token,
            ip: userIP, 
            location: userLocation
        }).then(resp => {
            console.log('debug recaptcha', (resp))
        });
    };

    const handleSubmit = async () => {
        if (!captchaValue) {
            alert('Please complete the CAPTCHA');
            return;
        }

        // Proceed with form submission or other actions
        console.log('CAPTCHA value:', captchaValue);
        alert('CAPTCHA completed successfully');
        await setCaptchaCookie(captchaValue, 12);
        // setCaptChaSubmitted(true);
    };

    return (
        <>
            <Dialog open={true} onOpenChange={toggleModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Disclaimer</DialogTitle>
                        <DialogDescription>
                            {DISCLAIMER_TEXT}
                        </DialogDescription>
                        <DialogFooter>
                            {/*{!CaptchaDisabledList.includes(window.location.host)  &&*/}
                                <div>
                                    <form onSubmit={handleSubmit}>
                                        <ReCAPTCHA
                                            sitekey={RECAPTCHA_SITE_KEY}
                                            onChange={handleCaptchaChange}
                                        />
                                    </form>
                                </div>


                            <Button color="primary" onClick={toggleModal} >I Agree</Button>

                            {/*{captchaValue === null && !CaptchaDisabledList.includes(window.location.host) ?*/}
                            {/*    <Button color="secondary" onClick={toggleModal} disabled>I Agree</Button> :*/}
                            {/*    <Button color="primary" onClick={toggleModal} >I Agree</Button>*/}
                            {/*}*/}
                        </DialogFooter>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default DisclaimerCaptcha;

