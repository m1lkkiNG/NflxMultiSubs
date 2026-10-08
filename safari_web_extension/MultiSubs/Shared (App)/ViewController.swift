//
//  ViewController.swift
//  Shared (App)
//
//  Created by Wing on 7/11/2021.
//

import WebKit

#if os(iOS)
import UIKit
typealias PlatformViewController = UIViewController
#elseif os(macOS)
import Cocoa
import SafariServices
typealias PlatformViewController = NSViewController
#endif

let extensionBundleIdentifier = "local.nflxmultisubs.safari.repair.Extension"

class ViewController: PlatformViewController, WKNavigationDelegate, WKScriptMessageHandler {

    @IBOutlet var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()

        self.webView.navigationDelegate = self

#if os(iOS)
        self.webView.scrollView.isScrollEnabled = false
#endif

        self.webView.configuration.userContentController.add(self, name: "controller")

        self.webView.loadFileURL(Bundle.main.url(forResource: "Main", withExtension: "html")!, allowingReadAccessTo: Bundle.main.resourceURL!)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
#if os(iOS)
        webView.evaluateJavaScript("show('ios')")
#elseif os(macOS)
        webView.evaluateJavaScript("show('mac')")

        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionBundleIdentifier) { (state, error) in
            guard let state = state, error == nil else {
                DispatchQueue.main.async {
                    self.showSetupError(error)
                }
                return
            }

            DispatchQueue.main.async {
                webView.evaluateJavaScript("show('mac', \(state.isEnabled))")
            }
        }
#endif
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
#if os(macOS)
        if (message.body as! String != "open-preferences") {
            return;
        }

        SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) { error in
            if let error = error {
                DispatchQueue.main.async { self.showSetupError(error) }
            }
        }
#endif
    }

    private func showSetupError(_ error: Error?) {
        let nsError = error as NSError?
        let code = nsError.map { "\($0.domain) (\($0.code))" } ?? "Extension not registered"
        let message = "Safari 尚未识别此扩展。请先运行安装包中的“安装或修复.command”，再在 Safari 设置中允许未签名扩展并启用。错误：" + code
        if let data = try? JSONSerialization.data(withJSONObject: [message]),
           let json = String(data: data, encoding: .utf8) {
            webView.evaluateJavaScript("showSetupError(\(json)[0])")
        }
    }

}
