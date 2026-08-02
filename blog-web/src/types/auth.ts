export type AdminVO = {
  id: number
  username: string
  name: string
  role: string
  avatar?: string | null
  token?: string
}

export type CurrentUser = {
  id: number
  username: string
  name: string
  role: string
  avatar?: string | null
}

export type AdminCaptcha = {
  captchaId: string
  imageBase64: string
}

export type LoginParams = {
  username: string
  password: string
  captchaID: string
  captchaCode: string
}

export type UpdateAdminProfileParams = {
  username: string
  name: string
}

export type ChangeAdminPasswordParams = {
  oldPassword: string
  newPassword: string
}

export type ValidateTokenResult = {
  valid: boolean
}

export type RefreshTokenResult = {
  token: string
}
