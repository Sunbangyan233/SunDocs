# Cloudflare Worker自选IP反代，实现OneDrive国际版下载提速

:::note 本文章缺少图片
请稍等一下，我们需要从哔哩哔哩迁移这些图片，可能需要几天时间。感谢您的支持！
Tips：已被删除的评论区无法恢复。
:::

:::tip 关于文章时间
本文首发于哔哩哔哩，后因违规被下架，日期为哔哩哔哩平台上的首发日期。
:::



> 最近OFB（onedrive for business）速度越来越慢了，虽然用idm这类多线程下载器也可以起一定的加速作用，但并不是每个人都有时间去研究。
网上搜到的也都是去注册应用，填写应用程序ID和客户端Key，实现展示+分享+下载文件。
但我只是需要下载啊（

折腾半天，也希望后人能少走些弯路吧;-)


-——

## 本实例的特点💡：

无需创建应用，无需管理员同意，即使学校账号没有开放API权限也可以使用。

仅支持单线程下载，且IDM不支持断点续传。（但浏览器可以）

IP选的好可大幅度提升大多数浏览器的下载速度，适合小白使用。

<!-- truncate -->
-——

## 准备：

1.一个Cloudflare账号
2.一个已接入Cloudflare的域名（本实例使用sunbangyan.cn下的子域名1drv.sunbangyan.cn）
3.一个速度较快的自选IP（本实例使用104.16.127.166）,最好v4v6都测一个，CF的v6速度也是很快的。
4.你的sharepoint组织名称（本实例为sunbangyan）

-——

## 具体步骤
打开 dash.cloudflare.com，找到左侧的Workers，打开它。

https://dash.cloudflare.com/{ZONE ID}

然后，轻点右方的“创建服务”。

https://dash.cloudflare.com/{ZONE ID}/workers/overview

创建页面显示什么不用管，直接划到下面，点击“创建服务”。

https://dash.cloudflare.com/{ZONE ID}/workers/services/new

创建后打开右下方的“快速编辑”，复制下面的内容：

```

'use strict'

/**
 * static files (404.html, sw.js, conf.js)
 */
const ASSET_URL = 'https://改成你的组织名称-my.sharepoint.com'

const JS_VER = 10
const MAX_RETRY = 1

/** @type {RequestInit} */
const PREFLIGHT_INIT = {
  status: 204,
  headers: new Headers({
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,TRACE,DELETE,HEAD,OPTIONS',
    'access-control-max-age': '1728000',
  }),
}

/**
 * @param {any} body
 * @param {number} status
 * @param {Object<string, string>} headers
 */
function makeRes(body, status = 200, headers = {}) {
  headers['--ver'] = JS_VER
  headers['access-control-allow-origin'] = '*'
  return new Response(body, {status, headers})
}


/**
 * @param {string} urlStr
 */
function newUrl(urlStr) {
  try {
    return new URL(urlStr)
  } catch (err) {
    return null
  }
}


addEventListener('fetch', e => {
  const ret = fetchHandler(e)
    .catch(err => makeRes('cfworker error:\n' + err.stack, 502))
  e.respondWith(ret)
})


/**
 * @param {FetchEvent} e
 */
async function fetchHandler(e) {
  const req = e.request
  const urlStr = req.url
  const urlObj = new URL(urlStr)
  const path = urlObj.href.substr(urlObj.origin.length)

  if (urlObj.protocol === 'http:') {
    urlObj.protocol = 'https:'
    return makeRes('', 301, {
      'strict-transport-security': 'max-age=99999999; includeSubDomains; preload',
      'location': urlObj.href,
    })
  }

  if (path.startsWith('/http/')) {
    return httpHandler(req, path.substr(6))
  }

  switch (path) {
  case '/http':
    return makeRes('请更新 cfworker 到最新版本!')
  case '/ws':
    return makeRes('not support', 400)
  case '/works':
    return makeRes('it works')
  default:
    // static files
    return fetch(ASSET_URL + path)
  }
}


/**
 * @param {Request} req
 * @param {string} pathname
 */
function httpHandler(req, pathname) {
  const reqHdrRaw = req.headers
  if (reqHdrRaw.has('x-jsproxy')) {
    return Response.error()
  }

  // preflight
  if (req.method === 'OPTIONS' &&
      reqHdrRaw.has('access-control-request-headers')
  ) {
    return new Response(null, PREFLIGHT_INIT)
  }

  let acehOld = false
  let rawSvr = ''
  let rawLen = ''
  let rawEtag = ''

  const reqHdrNew = new Headers(reqHdrRaw)
  reqHdrNew.set('x-jsproxy', '1')

  // 此处逻辑和 http-dec-req-hdr.lua 大致相同
  // https://github.com/EtherDream/jsproxy/blob/master/lua/http-dec-req-hdr.lua
  const refer = reqHdrNew.get('referer')
  const query = refer.substr(refer.indexOf('?') + 1)
  if (!query) {
    return makeRes('missing params', 403)
  }
  const param = new URLSearchParams(query)

  for (const [k, v] of Object.entries(param)) {
    if (k.substr(0, 2) === '--') {
      // 系统信息
      switch (k.substr(2)) {
      case 'aceh':
        acehOld = true
        break
      case 'raw-info':
        [rawSvr, rawLen, rawEtag] = v.split('|')
        break
      }
    } else {
      // 还原 HTTP 请求头
      if (v) {
        reqHdrNew.set(k, v)
      } else {
        reqHdrNew.delete(k)
      }
    }
  }
  if (!param.has('referer')) {
    reqHdrNew.delete('referer')
  }

  // cfworker 会把路径中的 `//` 合并成 `/`
  const urlStr = pathname.replace(/^(https?):\/+/, '$1://')
  const urlObj = newUrl(urlStr)
  if (!urlObj) {
    return makeRes('invalid proxy url: ' + urlStr, 403)
  }

  /** @type {RequestInit} */
  const reqInit = {
    method: req.method,
    headers: reqHdrNew,
    redirect: 'manual',
  }
  if (req.method === 'POST') {
    reqInit.body = req.body
  }
  return proxy(urlObj, reqInit, acehOld, rawLen, 0)
}


/**
 *
 * @param {URL} urlObj
 * @param {RequestInit} reqInit
 * @param {number} retryTimes
 */
async function proxy(urlObj, reqInit, acehOld, rawLen, retryTimes) {
  const res = await fetch(urlObj.href, reqInit)
  const resHdrOld = res.headers
  const resHdrNew = new Headers(resHdrOld)

  let expose = '*'

  for (const [k, v] of resHdrOld.entries()) {
    if (k === 'access-control-allow-origin' ||
        k === 'access-control-expose-headers' ||
        k === 'location' ||
        k === 'set-cookie'
    ) {
      const x = '--' + k
      resHdrNew.set(x, v)
      if (acehOld) {
        expose = expose + ',' + x
      }
      resHdrNew.delete(k)
    }
    else if (acehOld &&
      k !== 'cache-control' &&
      k !== 'content-language' &&
      k !== 'content-type' &&
      k !== 'expires' &&
      k !== 'last-modified' &&
      k !== 'pragma'
    ) {
      expose = expose + ',' + k
    }
  }

  if (acehOld) {
    expose = expose + ',--s'
    resHdrNew.set('--t', '1')
  }

  // verify
  if (rawLen) {
    const newLen = resHdrOld.get('content-length') || ''
    const badLen = (rawLen !== newLen)

    if (badLen) {
      if (retryTimes < MAX_RETRY) {
        urlObj = await parseYtVideoRedir(urlObj, newLen, res)
        if (urlObj) {
          return proxy(urlObj, reqInit, acehOld, rawLen, retryTimes + 1)
        }
      }
      return makeRes(res.body, 400, {
        '--error': `bad len: ${newLen}, except: ${rawLen}`,
        'access-control-expose-headers': '--error',
      })
    }

    if (retryTimes > 1) {
      resHdrNew.set('--retry', retryTimes)
    }
  }

  let status = res.status

  resHdrNew.set('access-control-expose-headers', expose)
  resHdrNew.set('access-control-allow-origin', '*')
  resHdrNew.set('--s', status)
  resHdrNew.set('--ver', JS_VER)

  resHdrNew.delete('content-security-policy')
  resHdrNew.delete('content-security-policy-report-only')
  resHdrNew.delete('clear-site-data')

  if (status === 301 ||
      status === 302 ||
      status === 303 ||
      status === 307 ||
      status === 308
  ) {
    status = status + 10
  }

  return new Response(res.body, {
    status,
    headers: resHdrNew,
  })
}


/**
 * @param {URL} urlObj
 */
function isYtUrl(urlObj) {
  return (
    urlObj.host.endsWith('.googlevideo.com') &&
    urlObj.pathname.startsWith('/videoplayback')
  )
}

/**
 * @param {URL} urlObj
 * @param {number} newLen
 * @param {Response} res
 */
async function parseYtVideoRedir(urlObj, newLen, res) {
  if (newLen > 2000) {
    return null
  }
  if (!isYtUrl(urlObj)) {
    return null
  }
  try {
    const data = await res.text()
    urlObj = new URL(data)
  } catch (err) {
    return null
  }
  if (!isYtUrl(urlObj)) {
    return null
  }
  return urlObj
}
```

然后回到上面，修改ASSET_URL这一行
（本示例改为https://sunbangyan-my.sharepoint.com）

https://dash.cloudflare.com/{ZONE ID}/workers/services/edit/quiet-term-b484/production

最后“保存并部署”，从左上角退出。

https://dash.cloudflare.com/{ZONE ID}/workers/services/view/quiet-term-b484/production

然后打开“触发器”，先在“自定义域”中，添加要作为反代服务的域名，等待3~5分钟后刷新页面，直到“证书”列显示为“有效”。

https://dash.cloudflare.com/{ZONE ID}/workers/services/view/quiet-term-b484/production/triggers?just-added-dns-route=1drv.sunbangyan.cn

在下方点击“添加路由”，同样输入反代域名，但这里注意一点，最后一定要

加上/*
加上/*
加上/*

否则会提示指向被禁止的IP不能下载。


-——

区域选择对应的根域名即可。

https://dash.cloudflare.com/{ZONE ID}/workers/services/view/quiet-term-b484/production/triggers

接下来删除掉自定义域，如图所示。

https://dash.cloudflare.com/{ZONE ID}/workers/services/view/quiet-term-b484/production/triggers

打开你的域名dns页，手动添加一条A记录解析，解析到你的自选IP。

并且点掉橙色云朵，改为“仅限DNS”。

https://dash.cloudflare.com/{ZONE ID}/sunbangyan.cn/dns

保存你的解析，至此，完成✅！

## 一些FAQ：

### 服务搭建好了，怎么用？
下载时将前面的xxxxx-my.sharepoint.com替换为你的反代地址即可，也可以用于配置Cloudreve。
这里有一个Demo，你可以尝试一下 https://www.sunbangyan.cn/s/WmnIg （钉钉6.5.40版本的安装包而已）

### CF自选IP咋搞？
参照这个项目自行测试 https://github.com/XIU2/CloudflareSpeedTest/，也可以看看这个站点 https://stock.hostmonit.com/CloudFlareYes/ 。

### 为什么worker没有效果甚至连接不上？
（针对某些地区）
可能是当地运营商屏蔽/干扰了Cloudflare cdn的IP，建议用idm开32线程直接从源站下载。
目前来看移动（香港直连）的效果相对最好。
## 附录
另一个脚本，来自https://blog.bbimax.com/archives/92，若网址无法使用，以下为存档。
```
// 商业转载请联系作者获得授权，非商业转载请注明出处。
// For commercial use, please contact the author for authorization. For non-commercial use, please indicate the source.
// 协议(License)：署名-非商业性使用-相同方式共享 4.0 国际 (CC BY-NC-SA 4.0)
// 作者(Author)：BBIMAX
// 链接(URL)：https://blog.bbimax.com/archives/92
// 来源(Source)：BBiMax晒鱼厂

// 替换成你OneDrive的网址
const upstream = '*-my.sharepoint.com'

// 替换成你OneDrive的网址
const upstream_mobile = '*-my.sharepoint.com'

// 下面的配置都不用动
const upstream_path = '/'

const blocked_region = ['KP', 'SY', 'PK', 'CU']

const blocked_ip_address = ['0.0.0.0', '127.0.0.1']

const https = true

const disable_cache = false

const replace_dict = {
    '$upstream': '$custom_domain',
    '//sunpma.com': ''
}

addEventListener('fetch', event => {
    event.respondWith(fetchAndApply(event.request));
})

async function fetchAndApply(request) {
    const region = request.headers.get('cf-ipcountry').toUpperCase();
    const ip_address = request.headers.get('cf-connecting-ip');
    const user_agent = request.headers.get('user-agent');

    let response = null;
    let url = new URL(request.url);
    let url_hostname = url.hostname;

    if (https == true) {
        url.protocol = 'https:';
    } else {
        url.protocol = 'http:';
    }

    if (await device_status(user_agent)) {
        var upstream_domain = upstream;
    } else {
        var upstream_domain = upstream_mobile;
    }

    url.host = upstream_domain;
    if (url.pathname == '/') {
        url.pathname = upstream_path;
    } else {
        url.pathname = upstream_path + url.pathname;
    }

    if (blocked_region.includes(region)) {
        response = new Response('Access denied: WorkersProxy is not available in your region yet.', {
            status: 403
        });
    } else if (blocked_ip_address.includes(ip_address)) {
        response = new Response('Access denied: Your IP address is blocked by WorkersProxy.', {
            status: 403
        });
    } else {
        let method = request.method;
        let request_headers = request.headers;
        let new_request_headers = new Headers(request_headers);

        new_request_headers.set('Host', upstream_domain);
        new_request_headers.set('Referer', url.protocol + '//' + url_hostname);

        let original_response = await fetch(url.href, {
            method: method,
            headers: new_request_headers
        })

        connection_upgrade = new_request_headers.get("Upgrade");
        if (connection_upgrade && connection_upgrade.toLowerCase() == "websocket") {
            return original_response;
        }

        let original_response_clone = original_response.clone();
        let original_text = null;
        let response_headers = original_response.headers;
        let new_response_headers = new Headers(response_headers);
        let status = original_response.status;

        if (disable_cache) {
            new_response_headers.set('Cache-Control', 'no-store');
        }

        new_response_headers.set('access-control-allow-origin', '*');
        new_response_headers.set('access-control-allow-credentials', true);
        new_response_headers.delete('content-security-policy');
        new_response_headers.delete('content-security-policy-report-only');
        new_response_headers.delete('clear-site-data');

        if (new_response_headers.get("x-pjax-url")) {
            new_response_headers.set("x-pjax-url", response_headers.get("x-pjax-url").replace("//" + upstream_domain, "//" + url_hostname));
        }

        const content_type = new_response_headers.get('content-type');
        if (content_type != null && content_type.includes('text/html') && content_type.includes('UTF-8')) {
            original_text = await replace_response_text(original_response_clone, upstream_domain, url_hostname);
        } else {
            original_text = original_response_clone.body
        }

        response = new Response(original_text, {
            status,
            headers: new_response_headers
        })
    }
    return response;
}

async function replace_response_text(response, upstream_domain, host_name) {
    let text = await response.text()

    var i, j;
    for (i in replace_dict) {
        j = replace_dict[i]
        if (i == '$upstream') {
            i = upstream_domain
        } else if (i == '$custom_domain') {
            i = host_name
        }

        if (j == '$upstream') {
            j = upstream_domain
        } else if (j == '$custom_domain') {
            j = host_name
        }

        let re = new RegExp(i, 'g')
        text = text.replace(re, j);
    }
    return text;
}


async function device_status(user_agent_info) {
    var agents = ["Android", "iPhone", "SymbianOS", "Windows Phone", "iPad", "iPod"];
    var flag = true;
    for (var v = 0; v < agents.length; v++) {
        if (user_agent_info.indexOf(agents[v]) > 0) {
            flag = false;
            break;
        }
    }
    return flag;
}
```


-——
以上为恢复的原文文本部分。