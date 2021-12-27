import { reactive } from "vue";

export type authUser = {
    email?: string;
    username: string;
}

export const authUser = reactive({
    username: "",
})

