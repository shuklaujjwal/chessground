(defproject chessground "0.1.0"
  :plugins [[lein-cljsbuild "1.0.3"]]
  :dependencies [[org.clojure/clojure "1.6.0"]
                 [org.clojure/clojurescript "0.0-2227"]
                 [org.clojure/core.async "0.1.303.0-886421-alpha"]
                 [quiescent-thib/quiescent-thib "0.1.2-THIB"]
                 [com.facebook/react "0.9.0.2"]
                 [jayq "2.5.1"]]
  :cljsbuild {:builds
              {:dev {:source-paths ["src"]
                     :compiler
                     {:output-dir "generated"
                      :output-to "generated/chessground.dev.js"
                      :optimizations :none
                      :source-map true
                      }}
               :prod {:source-paths ["src"]
                      :compiler
                      {:output-to "generated/chessground.min.js"
                       :optimizations :advanced
                       :preamble ["react/react.min.js"]
                       :externs ["react/externs/react.js" "externs/misc.js" "externs/jquery.js"]
                       :pretty-print true
                       :closure-warnings {:non-standard-jsdoc :off}}}}})

