/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

/** @format int32 */
export enum HolidayAccountType {
  Value0 = 0,
  Value1 = 1,
}

/** @format int32 */
export enum EmploymentType {
  Value0 = 0,
  Value1 = 1,
}

export interface CreateAnnouncementDto {
  /** @minLength 1 */
  message: string;
}

export interface CreateLeaveRequestDto {
  /** @format uuid */
  accountId?: string;
  accountType?: HolidayAccountType;
  /**
   * @format double
   * @min 0.001
   */
  requestedDays?: number;
  /**
   * @format double
   * @min 0
   */
  requestedHours?: number;
  /** @format date */
  startDate: string;
  /** @format date */
  endDate: string;
}

export interface CreateRulePresetDto {
  name?: string | null;
  settings?: HolidayRuleSettingsDto;
}

export interface CreateTransferDto {
  /** @format uuid */
  accountId: string;
  /**
   * @format double
   * @min 0.01
   * @max 37
   */
  hours?: number;
  writtenAgreement: boolean;
}

export interface CreateUserDto {
  /** @minLength 1 */
  fullName: string;
  /**
   * @format email
   * @minLength 1
   */
  email: string;
  /** @minLength 1 */
  password: string;
  role?: string | null;
  employmentType?: EmploymentType;
  workSchedule?: {
    Sunday?: DailyScheduleDto;
    Monday?: DailyScheduleDto;
    Tuesday?: DailyScheduleDto;
    Wednesday?: DailyScheduleDto;
    Thursday?: DailyScheduleDto;
    Friday?: DailyScheduleDto;
    Saturday?: DailyScheduleDto;
  } | null;
}

export interface DailyScheduleDto {
  /** @minLength 1 */
  from: string;
  /** @minLength 1 */
  to: string;
}

export interface HolidayRuleSettingsDto {
  /** @format double */
  weeks1To5HoursPerYear?: number;
  /** @format double */
  week6HoursPerYear?: number;
  /** @format double */
  mainHolidayNoticeMonths?: number;
  /** @format double */
  otherHolidayNoticeMonths?: number;
}

export interface LoginDto {
  email?: string | null;
  password?: string | null;
}

export interface PublicHoliday {
  /** @format uuid */
  id?: string;
  /** @format date */
  date?: string;
  name?: string | null;
  isCompanySpecific?: boolean;
}

export interface RejectLeaveRequestDto {
  reason?: string | null;
}

export interface SaveHolidayRulesDto {
  /** @format date */
  effectiveFrom?: string;
  settings?: HolidayRuleSettingsDto;
  name?: string | null;
}

export interface UpdateUserDto {
  fullName?: string | null;
  name?: string | null;
  email?: string | null;
  password?: string | null;
  role?: string | null;
  employmentType?: EmploymentType;
  workSchedule?: {
    Sunday?: DailyScheduleDto;
    Monday?: DailyScheduleDto;
    Tuesday?: DailyScheduleDto;
    Wednesday?: DailyScheduleDto;
    Thursday?: DailyScheduleDto;
    Friday?: DailyScheduleDto;
    Saturday?: DailyScheduleDto;
  } | null;
}

export type QueryParamsType = Record<string | number, any>;
export type ResponseFormat = keyof Omit<Body, "body" | "bodyUsed">;

export interface FullRequestParams extends Omit<RequestInit, "body"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseFormat;
  /** request body */
  body?: unknown;
  /** base url */
  baseUrl?: string;
  /** request cancellation token */
  cancelToken?: CancelToken;
}

export type RequestParams = Omit<
  FullRequestParams,
  "body" | "method" | "query" | "path"
>;

export interface ApiConfig<SecurityDataType = unknown> {
  baseUrl?: string;
  baseApiParams?: Omit<RequestParams, "baseUrl" | "cancelToken" | "signal">;
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<RequestParams | void> | RequestParams | void;
  customFetch?: typeof fetch;
}

export interface HttpResponse<D extends unknown, E extends unknown = unknown>
  extends Response {
  data: D;
  error: E;
}

type CancelToken = Symbol | string | number;

export enum ContentType {
  Json = "application/json",
  JsonApi = "application/vnd.api+json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public baseUrl: string = "";
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private abortControllers = new Map<CancelToken, AbortController>();
  private customFetch = (...fetchParams: Parameters<typeof fetch>) =>
    fetch(...fetchParams);

  private baseApiParams: RequestParams = {
    credentials: "same-origin",
    headers: {},
    redirect: "follow",
    referrerPolicy: "no-referrer",
  };

  constructor(apiConfig: ApiConfig<SecurityDataType> = {}) {
    Object.assign(this, apiConfig);
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected encodeQueryParam(key: string, value: any) {
    const encodedKey = encodeURIComponent(key);
    return `${encodedKey}=${encodeURIComponent(typeof value === "number" ? value : `${value}`)}`;
  }

  protected addQueryParam(query: QueryParamsType, key: string) {
    return this.encodeQueryParam(key, query[key]);
  }

  protected addArrayQueryParam(query: QueryParamsType, key: string) {
    const value = query[key];
    return value.map((v: any) => this.encodeQueryParam(key, v)).join("&");
  }

  protected toQueryString(rawQuery?: QueryParamsType): string {
    const query = rawQuery || {};
    const keys = Object.keys(query).filter(
      (key) => "undefined" !== typeof query[key],
    );
    return keys
      .map((key) =>
        Array.isArray(query[key])
          ? this.addArrayQueryParam(query, key)
          : this.addQueryParam(query, key),
      )
      .join("&");
  }

  protected addQueryParams(rawQuery?: QueryParamsType): string {
    const queryString = this.toQueryString(rawQuery);
    return queryString ? `?${queryString}` : "";
  }

  private contentFormatters: Record<ContentType, (input: any) => any> = {
    [ContentType.Json]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.JsonApi]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.Text]: (input: any) =>
      input !== null && typeof input !== "string"
        ? JSON.stringify(input)
        : input,
    [ContentType.FormData]: (input: any) => {
      if (input instanceof FormData) {
        return input;
      }

      return Object.keys(input || {}).reduce((formData, key) => {
        const property = input[key];
        formData.append(
          key,
          property instanceof Blob
            ? property
            : typeof property === "object" && property !== null
              ? JSON.stringify(property)
              : `${property}`,
        );
        return formData;
      }, new FormData());
    },
    [ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
  };

  protected mergeRequestParams(
    params1: RequestParams,
    params2?: RequestParams,
  ): RequestParams {
    return {
      ...this.baseApiParams,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...(this.baseApiParams.headers || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected createAbortSignal = (
    cancelToken: CancelToken,
  ): AbortSignal | undefined => {
    if (this.abortControllers.has(cancelToken)) {
      const abortController = this.abortControllers.get(cancelToken);
      if (abortController) {
        return abortController.signal;
      }
      return void 0;
    }

    const abortController = new AbortController();
    this.abortControllers.set(cancelToken, abortController);
    return abortController.signal;
  };

  public abortRequest = (cancelToken: CancelToken) => {
    const abortController = this.abortControllers.get(cancelToken);

    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(cancelToken);
    }
  };

  public request = async <T = any, E = any>({
    body,
    secure,
    path,
    type,
    query,
    format,
    baseUrl,
    cancelToken,
    ...params
  }: FullRequestParams): Promise<HttpResponse<T, E>> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.baseApiParams.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const queryString = query && this.toQueryString(query);
    const payloadFormatter = this.contentFormatters[type || ContentType.Json];
    const responseFormat = format || requestParams.format;

    return this.customFetch(
      `${baseUrl || this.baseUrl || ""}${path}${queryString ? `?${queryString}` : ""}`,
      {
        ...requestParams,
        headers: {
          ...(requestParams.headers || {}),
          ...(type && type !== ContentType.FormData
            ? { "Content-Type": type }
            : {}),
        },
        signal:
          (cancelToken
            ? this.createAbortSignal(cancelToken)
            : requestParams.signal) || null,
        body:
          typeof body === "undefined" || body === null
            ? null
            : payloadFormatter(body),
      },
    ).then(async (response) => {
      const r = response as HttpResponse<T, E>;
      r.data = null as unknown as T;
      r.error = null as unknown as E;

      const responseToParse = responseFormat ? response.clone() : response;
      const data = !responseFormat
        ? r
        : await responseToParse[responseFormat]()
            .then((data) => {
              if (r.ok) {
                r.data = data;
              } else {
                r.error = data;
              }
              return r;
            })
            .catch((e) => {
              r.error = e;
              return r;
            });

      if (cancelToken) {
        this.abortControllers.delete(cancelToken);
      }

      if (!response.ok) throw data;
      return data;
    });
  };
}

/**
 * @title Backend
 * @version 1.0
 */
export class Api<
  SecurityDataType extends unknown,
> extends HttpClient<SecurityDataType> {
  api = {
    /**
     * No description
     *
     * @tags Announcements
     * @name AnnouncementsList
     * @request GET:/api/announcements
     * @secure
     */
    announcementsList: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/announcements`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Announcements
     * @name AnnouncementsCreate
     * @request POST:/api/announcements
     * @secure
     */
    announcementsCreate: (
      data: CreateAnnouncementDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/api/announcements`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name AuthLoginCreate
     * @request POST:/api/Auth/login
     * @secure
     */
    authLoginCreate: (data: LoginDto, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/Auth/login`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name AuthMeList
     * @request GET:/api/Auth/me
     * @secure
     */
    authMeList: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/Auth/me`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name AuthLogoutCreate
     * @request POST:/api/Auth/logout
     * @secure
     */
    authLogoutCreate: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/Auth/logout`,
        method: "POST",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name AuthUsersList
     * @request GET:/api/Auth/users
     * @secure
     */
    authUsersList: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/Auth/users`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name AuthUsersCreate
     * @request POST:/api/Auth/users
     * @secure
     */
    authUsersCreate: (data: CreateUserDto, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/Auth/users`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name AuthUsersUpdate
     * @request PUT:/api/Auth/users/{id}
     * @secure
     */
    authUsersUpdate: (
      id: string,
      data: UpdateUserDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/api/Auth/users/${id}`,
        method: "PUT",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name AuthUsersDelete
     * @request DELETE:/api/Auth/users/{id}
     * @secure
     */
    authUsersDelete: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/Auth/users/${id}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags HolidayAccounts
     * @name EmployeesHolidayAccountsList
     * @request GET:/api/employees/{employeeId}/holiday-accounts
     * @secure
     */
    employeesHolidayAccountsList: (
      employeeId: string,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/api/employees/${employeeId}/holiday-accounts`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags HolidayAccounts
     * @name EmployeesScheduleList
     * @request GET:/api/employees/{employeeId}/schedule
     * @secure
     */
    employeesScheduleList: (employeeId: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/employees/${employeeId}/schedule`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags HolidayAccounts
     * @name EmployeesScheduleHistoryList
     * @request GET:/api/employees/{employeeId}/schedule-history
     * @secure
     */
    employeesScheduleHistoryList: (
      employeeId: string,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/api/employees/${employeeId}/schedule-history`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags HolidayAccounts
     * @name EmployeesList
     * @request GET:/api/employees
     * @secure
     */
    employeesList: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/employees`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags HolidayAccounts
     * @name HolidayAccountsFutureBalanceList
     * @request GET:/api/holiday-accounts/future-balance
     * @secure
     */
    holidayAccountsFutureBalanceList: (
      query?: {
        /** @format date */
        date?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/api/holiday-accounts/future-balance`,
        method: "GET",
        query: query,
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags LeaveRequests
     * @name LeaveRequestsCreate
     * @request POST:/api/leave-requests
     * @secure
     */
    leaveRequestsCreate: (
      data: CreateLeaveRequestDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/api/leave-requests`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags LeaveRequests
     * @name LeaveRequestsList
     * @request GET:/api/leave-requests
     * @secure
     */
    leaveRequestsList: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/leave-requests`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags LeaveRequests
     * @name LeaverequestsCreate
     * @request POST:/api/leaverequests
     * @secure
     */
    leaverequestsCreate: (
      data: CreateLeaveRequestDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/api/leaverequests`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags LeaveRequests
     * @name LeaverequestsList
     * @request GET:/api/leaverequests
     * @secure
     */
    leaverequestsList: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/leaverequests`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags LeaveRequests
     * @name LeaveRequestsCancelCreate
     * @request POST:/api/leave-requests/{id}/cancel
     * @secure
     */
    leaveRequestsCancelCreate: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/leave-requests/${id}/cancel`,
        method: "POST",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags LeaveRequests
     * @name LeaverequestsCancelCreate
     * @request POST:/api/leaverequests/{id}/cancel
     * @secure
     */
    leaverequestsCancelCreate: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/leaverequests/${id}/cancel`,
        method: "POST",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags LeaveRequests
     * @name LeaveRequestsApproveCreate
     * @request POST:/api/leave-requests/{id}/approve
     * @secure
     */
    leaveRequestsApproveCreate: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/leave-requests/${id}/approve`,
        method: "POST",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags LeaveRequests
     * @name LeaverequestsApproveCreate
     * @request POST:/api/leaverequests/{id}/approve
     * @secure
     */
    leaverequestsApproveCreate: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/leaverequests/${id}/approve`,
        method: "POST",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags LeaveRequests
     * @name LeaveRequestsRejectCreate
     * @request POST:/api/leave-requests/{id}/reject
     * @secure
     */
    leaveRequestsRejectCreate: (
      id: string,
      data: RejectLeaveRequestDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/api/leave-requests/${id}/reject`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags LeaveRequests
     * @name LeaverequestsRejectCreate
     * @request POST:/api/leaverequests/{id}/reject
     * @secure
     */
    leaverequestsRejectCreate: (
      id: string,
      data: RejectLeaveRequestDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/api/leaverequests/${id}/reject`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags LeaveRequests
     * @name LeaveRequestsTransferCreate
     * @request POST:/api/leave-requests/transfer
     * @secure
     */
    leaveRequestsTransferCreate: (
      data: CreateTransferDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/api/leave-requests/transfer`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags LeaveRequests
     * @name LeaverequestsTransferCreate
     * @request POST:/api/leaverequests/transfer
     * @secure
     */
    leaverequestsTransferCreate: (
      data: CreateTransferDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/api/leaverequests/transfer`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags LeaveRequests
     * @name LeaveRequestsPendingList
     * @request GET:/api/leave-requests/pending
     * @secure
     */
    leaveRequestsPendingList: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/leave-requests/pending`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags LeaveRequests
     * @name LeaverequestsPendingList
     * @request GET:/api/leaverequests/pending
     * @secure
     */
    leaverequestsPendingList: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/leaverequests/pending`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags LeaveRequests
     * @name LeaveRequestsHistoryList
     * @request GET:/api/leave-requests/history
     * @secure
     */
    leaveRequestsHistoryList: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/leave-requests/history`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags LeaveRequests
     * @name LeaverequestsHistoryList
     * @request GET:/api/leaverequests/history
     * @secure
     */
    leaverequestsHistoryList: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/leaverequests/history`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags LeaveRequests
     * @name LeaveRequestsApprovedHolidaysList
     * @request GET:/api/leave-requests/approved-holidays
     * @secure
     */
    leaveRequestsApprovedHolidaysList: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/leave-requests/approved-holidays`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags LeaveRequests
     * @name LeaverequestsApprovedHolidaysList
     * @request GET:/api/leaverequests/approved-holidays
     * @secure
     */
    leaverequestsApprovedHolidaysList: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/leaverequests/approved-holidays`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags LeaveRequests
     * @name LeaveRequestsDetail
     * @request GET:/api/leave-requests/{id}
     * @secure
     */
    leaveRequestsDetail: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/leave-requests/${id}`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags LeaveRequests
     * @name LeaverequestsDetail
     * @request GET:/api/leaverequests/{id}
     * @secure
     */
    leaverequestsDetail: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/leaverequests/${id}`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags LeaveRequests
     * @name EmployeesLeaveRequestsList
     * @request GET:/api/employees/{employeeId}/leave-requests
     * @secure
     */
    employeesLeaveRequestsList: (
      employeeId: string,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/api/employees/${employeeId}/leave-requests`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags PublicHolidays
     * @name PublicHolidaysList
     * @request GET:/api/public-holidays
     * @secure
     */
    publicHolidaysList: (
      query?: {
        /** @format date */
        from?: string;
        /** @format date */
        to?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/api/public-holidays`,
        method: "GET",
        query: query,
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags PublicHolidays
     * @name PublicHolidaysCreate
     * @request POST:/api/public-holidays
     * @secure
     */
    publicHolidaysCreate: (data: PublicHoliday, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/public-holidays`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags PublicHolidays
     * @name PublicHolidaysUpdate
     * @request PUT:/api/public-holidays/{id}
     * @secure
     */
    publicHolidaysUpdate: (
      id: string,
      data: PublicHoliday,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/api/public-holidays/${id}`,
        method: "PUT",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags PublicHolidays
     * @name PublicHolidaysDelete
     * @request DELETE:/api/public-holidays/{id}
     * @secure
     */
    publicHolidaysDelete: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/public-holidays/${id}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags RulePresets
     * @name RulePresetsList
     * @request GET:/api/rule-presets
     * @secure
     */
    rulePresetsList: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/rule-presets`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags RulePresets
     * @name RulePresetsCreate
     * @request POST:/api/rule-presets
     * @secure
     */
    rulePresetsCreate: (
      data: CreateRulePresetDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/api/rule-presets`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags RulePresets
     * @name RulePresetsDetail
     * @request GET:/api/rule-presets/{id}
     * @secure
     */
    rulePresetsDetail: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/rule-presets/${id}`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags SystemParameters
     * @name SystemParametersList
     * @request GET:/api/system-parameters
     * @secure
     */
    systemParametersList: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/system-parameters`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags SystemParameters
     * @name SystemParametersCreate
     * @request POST:/api/system-parameters
     * @secure
     */
    systemParametersCreate: (
      data: SaveHolidayRulesDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/api/system-parameters`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),
  };
}
