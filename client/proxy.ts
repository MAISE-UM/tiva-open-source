import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {getUserPermissions} from "@/api/admin-api";
import {UserPermission} from "@/app/utils/interfaces";
import {jwtRefreshUsername, refreshTokenInit} from "@/app/utils/auth";

export async function proxy(request: NextRequest) {
    // Check if the user is authenticated
    const isAuthenticated = await refreshTokenInit()

    // console.log('route request', request.nextUrl.pathname);

    // If the user is not authenticated and not already on an auth or 404 page, redirect to logout page to clear cookies
    if (!isAuthenticated && (request.nextUrl.pathname.search('auth') === -1 && request.nextUrl.pathname.search('404') === -1 && request.nextUrl.pathname.search('images') === -1 && request.nextUrl.pathname.search('admin/health') === -1)) {
        // Store the original URL
        const params = new URLSearchParams()

        // Redirect to log in with the original URL as a query parameter
        const logoutRedirectResponse = NextResponse.redirect(new URL(`${process.env.NEXT_PUBLIC_LAUNCH_BASE_URL}/auth/logout?${params.toString()}`, request.url))
        // This is necessary for server components to access the original URL
        logoutRedirectResponse.headers.set('x-url', request.url);
        return NextResponse.redirect(new URL(`${process.env.NEXT_PUBLIC_LAUNCH_BASE_URL}/auth/logout?${params.toString()}`, request.url))
    } else if(request.nextUrl.pathname.search('auth') === -1 && request.nextUrl.pathname.search('404') === -1 && request.nextUrl.pathname.search('images') === -1 && request.nextUrl.pathname.search('admin/health') === -1) {
        // If the user is authenticated and trying to access a protected route, check their permissions
        const res = NextResponse.next();
        // This is necessary for server components to access the original URL
        res.headers.set('x-url', request.url);

        // In a development environment the image paths will get caught by the middleware, so we need to allow them to pass
        const pathImage = request.nextUrl.pathname.toLowerCase().includes('image');
        if(pathImage) {
            console.log('image path', request.nextUrl.pathname);
            return res;
        }

        // We get the user's username from the refresh token because the access token may be expired
        // If the refresh token is expired, the user will be redirected to the logout page
        const username = await jwtRefreshUsername()

        if(username == null) {
            return res;
        }

        // Whenever a protected route is accessed we must check the user's permissions and set it into a cookie
        // so the client can access it and determine what components to show and what access to give
        const userPermissions = await getUserPermissions(username)
        // console.log('permissionResponse', userPermissions);

        if(userPermissions != null) {
            // The / rote is treated as the dashboard route. This can be changed to any route you want to be the default
            const path = request.nextUrl.pathname === '/' ? '/Dashboard' : request.nextUrl.pathname;
            // A permission cookie will include all permissions for every route in the chain.
            // Example: /admin/api-editor splits into ['','admin','api-editor']. We set '' to 'Shared' so we put the
            //      permissions for Shared, Admin, and API-Editor routes into the cookie. This should cut down on
            //      repetitive permission definitions in the database.
            let routesToTry = path.split('/');
            routesToTry[0] = 'Shared';
            routesToTry = routesToTry.reverse();

            let permissionList: UserPermission[] = [];
            for(const route of routesToTry) {
                // console.log('routes', userPermissions.Routes);
               if(userPermissions.Routes.filter(permission => permission.Function_Name.toLowerCase() === route.toLowerCase() || route.toLowerCase() === 'shared').length > 0) {
                   const filteredPermissions = userPermissions.Permissions.filter(permission => permission.Route.toLowerCase() === route.toLowerCase())
                   permissionList = [...permissionList, ...filteredPermissions] ;
               }
            }
            userPermissions.Permissions = permissionList;

            // Permissions available in this cookie should always be relevant to the current route. Changing routes
            // should always update the permission cookie.
            res.cookies.set("user-permissions", JSON.stringify(userPermissions), {
                httpOnly: false, // Allow frontend to access
                path: "/",
            });

            // If the user does not have access to the route they are trying to access, redirect to 404
            const matchedRoutes = userPermissions.Routes.filter(permission => {
                return permission.Function_Details.toLowerCase() === request.nextUrl.pathname.toLowerCase()
            })

            if(matchedRoutes.length === 0) {
                console.log('no match', request.nextUrl.pathname);
                const redirect404Response = NextResponse.redirect(new URL(`${process.env.NEXT_PUBLIC_LAUNCH_BASE_URL}/404`, request.url))
                redirect404Response.headers.set('x-url', request.url);
                return redirect404Response;
            }
        }
        return res;
    } else {
        // If user is trying to access an unauthenticated route, allow them to continue
        const response = NextResponse.next();
        // This is necessary for server components to access the original URL
        response.headers.set('x-url', request.url);
        return response;
    }
}

// the matcher determines what routes trigger the middleware
export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}

