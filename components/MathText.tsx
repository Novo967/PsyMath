import React, { useCallback, useState, useEffect } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';

interface MathTextProps {
  text: string;
  style?: StyleProp<ViewStyle>;
  color?: string;
  fontSize?: number;
}

export default function MathText({ text, style, color = '#2D3748', fontSize = 16 }: MathTextProps) {
  const [webViewHeight, setWebViewHeight] = useState(10);

  // Reset height when text changes to prevent cumulative height bug
  useEffect(() => {
    setWebViewHeight(10);
  }, [text]);

  const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>
        * { box-sizing: border-box; }
        html, body {
          margin: 0;
          padding: 0;
          background-color: transparent;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          font-size: ${fontSize}px;
          color: ${color};
          text-align: right;
          word-wrap: break-word;
          overflow: hidden;
          line-height: 1.6;
        }
        #content {
          display: inline-block;
          width: 100%;
          padding: 0;
          margin: 0;
        }
        /* Ensure SVGs from MathJax are vertically aligned with text */
        mjx-container[jax="SVG"] {
          direction: ltr; /* Math is LTR */
        }
      </style>
      <script>
        window.MathJax = {
          tex: {
            inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
            displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
            processEscapes: true
          },
          svg: {
            fontCache: 'global'
          },
          startup: {
            pageReady: () => {
              return MathJax.startup.defaultPageReady().then(() => {
                // Measure after MathJax renders, with multiple retries
                // to catch async SVG layout completion
                measureAndPost();
                setTimeout(measureAndPost, 100);
                setTimeout(measureAndPost, 300);
                setTimeout(measureAndPost, 800);
              });
            }
          }
        };

        function measureAndPost() {
          if (window.ReactNativeWebView) {
            var content = document.getElementById('content');
            if (content) {
              // Measure the specific content div to avoid taking full window height
              var h = content.getBoundingClientRect().height;
              window.ReactNativeWebView.postMessage(String(Math.ceil(h)));
            }
          }
        }
      </script>
      <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js" id="MathJax-script" async></script>
    </head>
    <body>
      <div id="content">
        ${text.replace(/\\n/g, '<br/>')}
      </div>
      <script>
        // ResizeObserver as a fallback for dynamic content changes
        var resizeObserver = new ResizeObserver(function(entries) {
          for (var i = 0; i < entries.length; i++) {
            measureAndPost();
          }
        });
        var contentDiv = document.getElementById('content');
        if (contentDiv) {
          resizeObserver.observe(contentDiv);
        }
      </script>
    </body>
    </html>
  `;

  const handleMessage = useCallback((event: any) => {
    const height = parseInt(event.nativeEvent.data, 10);
    if (!isNaN(height) && height > 0) {
      // Add a small buffer to prevent edge-case clipping, but DO NOT use Math.max with prev
      // so the height can shrink when new text is loaded.
      setWebViewHeight(height + 4);
    }
  }, []);

  return (
    <View style={[{ height: webViewHeight, overflow: 'visible', opacity: 0.99 }, style]}>
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={{ backgroundColor: 'transparent', width: '100%', height: webViewHeight }}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </View>
  );
}
