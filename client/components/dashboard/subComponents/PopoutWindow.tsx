'use client'
import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";

interface PopoutWindowComponent {
    modalOpen: boolean, 
    setModalOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const PopoutWindow: React.FC<PopoutWindowComponent> = ( {modalOpen, setModalOpen} ) => {
    // const [modalOpen, setModalOpen] = useState(false);
  
    const toggleModal = () => {
      setModalOpen(!modalOpen);
    };
  
    return (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Input Warning!</DialogTitle>
                    <DialogDescription>
                        You must make sure that the height is between 10 and 200 cms, or 3.94 and 78.74 inches.
                    </DialogDescription>
                    <DialogFooter>
                        <Button variant="secondary" onClick={toggleModal}>Close</Button>
                    </DialogFooter>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    );
  };
  
  export default PopoutWindow;
