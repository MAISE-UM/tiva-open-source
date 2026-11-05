"use client"

import { useEffect, useState } from "react"
import type { User, Role } from "@/app/utils/interfaces"
import {getObjectsList, processUserResponse} from "@/lib/utils"
import {deleteUser, editUser, getUserRoles, getUsersByRole} from "@/api/admin-api"
import {UserTable} from "@/app/admin/user-admin/sub-components/UserTable";
import {EditUserModal} from "@/app/admin/user-admin/sub-components/EditUseModal";
import {DeleteUserModal} from "@/app/admin/user-admin/sub-components/DeleteUserModal";
import {PlusIcon} from "lucide-react";

const emptyUser: User = {
    User_ID: -1,
    Name: "",
    First_Name: "",
    Last_Name: "",
    UserName: "",
    Is_Active: true,
    Roles: "",
    ProcessedRoles: [],
}

export default function AdminUsers() {
    const [shownUsers, setShownUsers] = useState<Array<User>>([])
    const [allUsers, setAllUsers] = useState<Array<User>>([])
    const [currentPage, setCurrentPage] = useState<number>(1)
    const [searchTerm, setSearchTerm] = useState<string>("")
    const [searchTermField, setSearchTermField] = useState<string>("")
    const [sort, setSort] = useState<{ column: "User_ID" | "Name" | "UserName" | "Roles"; ascending: boolean }>({
        column: "User_ID",
        ascending: true,
    })
    const [editUserObj, setEditUserObj] = useState<User>(emptyUser)
    const [editUserModalOpen, setEditUserModalOpen] = useState<boolean>(false)
    const [userRolesList, setUserRolesList] = useState<{ label: string; value: number }[]>([])
    const [userToDelete, setUserToDelete] = useState<User>(emptyUser)
    const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState(true)
    
    useEffect(() => {
        const filterUsers = (filterTerm: string) => {
            const searchFunc = (val: User) => {
                return (
                    val.UserName.toUpperCase().indexOf(filterTerm.toUpperCase()) !== -1 ||
                    (val.First_Name + " " + val.Last_Name).toUpperCase().indexOf(filterTerm.toUpperCase()) !== -1
                )
            }
            if (filterTerm === "") {
                setShownUsers(allUsers)
                return
            }
            setShownUsers(allUsers.filter(searchFunc))
        }
        
        if (searchTermField !== searchTerm) {
            setSearchTerm(searchTermField)
            filterUsers(searchTermField)
        }
    }, [searchTermField, allUsers, searchTerm])

    useEffect(() => {
        const newUsers = [...shownUsers]
        const sortedUsers = newUsers.sort((a, b) => {
            let ret
            switch (sort.column) {
                case "User_ID": {
                    ret = a.User_ID - b.User_ID
                    break
                }
                case "Name": {
                    const aName = a.First_Name + " " + a.Last_Name
                    const bName = b.First_Name + " " + b.Last_Name
                    ret = aName.localeCompare(bName)
                    break
                }
                case "UserName": {
                    ret = a.UserName.localeCompare(b.UserName)
                    break
                }
                case "Roles": {
                    ret = a.Roles.localeCompare(b.Roles)
                    break
                }
            }
            return sort.ascending ? ret : ret * -1
        });
        if(JSON.stringify(shownUsers) !== JSON.stringify(sortedUsers))
        {
            setShownUsers(sortedUsers)
        }
    }, [shownUsers, sort])

    useEffect(() => {
        if(userRolesList.length !== 0) return;
        setIsLoading(true)
        const promises = [getUserRoles(), getUsersByRole("")]
        Promise.all(promises).then((responses) => {
            const [userRolesResponse, userListResponse] = responses;
            const newUserRolesList = getObjectsList<Role>(userRolesResponse).map((userRole: Role) => {
                return { label: userRole.Role_Name, value: userRole.Role_ID }
            })
            if(userRolesList.length === 0) {
                setUserRolesList(newUserRolesList)
                const newUserList: User[] = processUserResponse(userListResponse, newUserRolesList)
                
                if(shownUsers)
                    setShownUsers(newUserList)
                setAllUsers(newUserList)
                
                setIsLoading(false)
            } else {
                setIsLoading(false)
            }
        }).catch((error) => {
            console.error("Error getting user roles", error)
            setIsLoading(false)
        });
    }, [shownUsers, userRolesList])

    const refreshUsers = async () => {
        setIsLoading(true)
        try {
            const userListResponse = await getUsersByRole("")
            const newUserList: User[] = processUserResponse(userListResponse, userRolesList)
            if(shownUsers)
                setShownUsers(newUserList)
            setAllUsers(newUserList)
        } catch (error) {
            console.error("Error refreshing users", error)
        } finally {
            setIsLoading(false)
        }
    }

    const toggleEditUserModal = () => {
        setEditUserModalOpen(!editUserModalOpen)
    }

    const submitEditModal = () => {
        editUser({
            User_ID: editUserObj.User_ID === -1 ? null : editUserObj.User_ID,
            User_Name: editUserObj.UserName,
            First_Name: editUserObj.First_Name,
            Last_Name: editUserObj.Last_Name,
            Role_ID_List: editUserObj.ProcessedRoles.map((role) => role.value).join(","),
            Is_Active: 1,
        }).then(refreshUsers);
    }

    const toggleDeleteModal = () => {
        setDeleteModalOpen(!deleteModalOpen)
    }

    const submitDelete = () => {
        deleteUser({
            User_ID: userToDelete.User_ID,
        }).then(refreshUsers);
    }

    return (
        <div className="bg-gray-100">
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <h1 className="text-3xl font-bold text-gray-900 mb-6">User Administration</h1>
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 bg-white border-b border-gray-200">
                            <div className="flex justify-between items-center mb-6">
                                <button
                                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition duration-150 ease-in-out flex items-center"
                                    onClick={() => {
                                        setEditUserObj(emptyUser)
                                        toggleEditUserModal()
                                    }}
                                >
                                    <PlusIcon className="h-5 w-5 mr-2" />
                                    Add New User
                                </button>
                            </div>
                            <UserTable
                                users={shownUsers}
                                sort={sort}
                                setSort={setSort}
                                searchTermField={searchTermField}
                                setSearchTermField={setSearchTermField}
                                setEditUserObj={setEditUserObj}
                                toggleEditUserModal={toggleEditUserModal}
                                setUserToDelete={setUserToDelete}
                                toggleDeleteModal={toggleDeleteModal}
                                isLoading={isLoading}
                                setCurrentPageAction={setCurrentPage}
                                currentPage={currentPage}
                            />
                        </div>
                    </div>
                </div>
            </div>
            <EditUserModal
                isOpen={editUserModalOpen}
                toggle={toggleEditUserModal}
                user={editUserObj}
                setUser={setEditUserObj}
                userRolesList={userRolesList}
                onSave={submitEditModal}
            />
            <DeleteUserModal
                isOpen={deleteModalOpen}
                toggle={toggleDeleteModal}
                user={userToDelete}
                onDelete={submitDelete}
            />
        </div>
    )
}

