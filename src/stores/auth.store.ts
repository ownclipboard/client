import { reactive } from "vue";

export type authUser = {
    username: string;
}

export const authUser = reactive({
    username: "",
})

