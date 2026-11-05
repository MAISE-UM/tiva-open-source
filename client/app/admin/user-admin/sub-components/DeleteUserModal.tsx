import type React from "react"
import type { User } from "@/app/utils/interfaces"
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteUserModalProps {
    isOpen: boolean
    toggle: () => void
    user: User
    onDelete: () => void
}

export const DeleteUserModal: React.FC<DeleteUserModalProps> = ({ isOpen, toggle, user, onDelete }) => {
    return  (
        <Dialog open={isOpen} onOpenChange={toggle}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete User</DialogTitle>
                </DialogHeader>
                <div className="mt-2">
                    <p className="text-sm text-gray-500 text-center">
                        Are you sure you want to delete the user &#34;{user.UserName}&#34;? This action cannot be undone.
                    </p>
                </div>

                <div className="mt-6 flex justify-center space-x-3">
                    <Button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                        onClick={toggle}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                        onClick={() => {
                            onDelete()
                            toggle()
                        }}
                    >
                        Delete
                    </Button>
                </div>
            </DialogContent>
        </Dialog>

    )
}

