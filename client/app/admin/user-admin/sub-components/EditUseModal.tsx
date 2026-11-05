import type React from "react"
import type { User } from "@/app/utils/interfaces"
import Select from "react-select"
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";

interface EditUserModalProps {
    isOpen: boolean
    toggle: () => void
    user: User
    setUser: React.Dispatch<React.SetStateAction<User>>
    userRolesList: { label: string; value: number }[]
    onSave: () => void
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
    isOpen,
    toggle,
    user,
    setUser,
    userRolesList,
    onSave,
}) => {
    return  (
        <Dialog open={isOpen} onOpenChange={toggle}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{user.User_ID === -1 ? "Add New User" : "Edit User"}</DialogTitle>
                </DialogHeader>
                <div className="mt-4 space-y-4">
                    <div>
                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                            First Name
                        </label>
                        <Input
                            type="text"
                            name="firstName"
                            id="firstName"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            value={user.First_Name}
                            onChange={(e) => setUser({ ...user, First_Name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                            Last Name
                        </label>
                        <Input
                            type="text"
                            name="lastName"
                            id="lastName"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            value={user.Last_Name}
                            onChange={(e) => setUser({ ...user, Last_Name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                            Username
                        </label>
                        <Input
                            type="text"
                            name="username"
                            id="username"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            value={user.UserName}
                            onChange={(e) => setUser({ ...user, UserName: e.target.value })}
                        />
                    </div>
                    <div>
                        <label htmlFor="roles" className="block text-sm font-medium text-gray-700">
                            Roles
                        </label>
                        <Select
                            isMulti
                            name="roles"
                            options={userRolesList}
                            className="mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            classNamePrefix="select"
                            value={user.ProcessedRoles}
                            onChange={(selectedOptions) => {
                                const newUser = { ...user }
                                newUser.ProcessedRoles = selectedOptions as { label: string; value: number }[]
                                newUser.Roles = selectedOptions.map((role) => role.label).join("|")
                                setUser(newUser)
                            }}
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        onClick={toggle}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        onClick={() => {
                            onSave()
                            toggle()
                        }}
                    >
                        Save
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

